using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;

namespace MashupArena
{
    [Serializable]
    public sealed class LocalProfile
    {
        public string displayName = "Player";
        public int colorIndex;
        public bool wearingHat = true;
        public bool reducedMotion;
    }

    public sealed class ArenaAction : MonoBehaviour
    {
        public string id;
        public Color normalColor;
        public Renderer surface;

        public void SetHighlighted(bool highlighted)
        {
            if (surface != null)
                surface.material.color = highlighted ? Color.Lerp(normalColor, Color.white, 0.33f) : normalColor;
        }
    }

    public sealed class ChessSquareTarget : MonoBehaviour
    {
        public int square;
    }

    /// <summary>
    /// Unity vertical slice: 3D home, local avatar/profile, walkable hub and
    /// a Chess-vs-bot room backed by rules independent of this visual layer.
    /// </summary>
    public sealed class ArenaApp : MonoBehaviour
    {
        private enum ScreenId { Home, Customization, Hub, Settings, ChessRoom }

        private static readonly Color[] AvatarColors =
        {
            new Color(0.15f, 0.82f, 0.90f),
            new Color(1.00f, 0.42f, 0.48f),
            new Color(0.94f, 0.75f, 0.26f),
            new Color(0.48f, 0.84f, 0.49f),
            new Color(0.70f, 0.51f, 0.98f),
            new Color(0.98f, 0.57f, 0.30f)
        };

        private readonly List<ArenaAction> actions = new List<ArenaAction>();
        private readonly List<Material> screenMaterials = new List<Material>();
        private GameObject screenRoot;
        private Camera mainCamera;
        private Transform avatar;
        private TextMesh nameLabel;
        private ArenaAction hovered;
        private LocalProfile profile;
        private ScreenId screen;
        private string editingName;
        private int keyboardSelection;
        private float lookYaw;
        private Vector3 hubSpawn = new Vector3(0f, 1.7f, 9f);
        private ChessPosition chess;
        private readonly Renderer[] chessSquares = new Renderer[64];
        private int selectedChessSquare = -1;
        private List<ChessMove> promotionChoices;
        private ChessMove? lastChessMove;
        private bool chessFocus = true;
        private bool botThinking;
        private bool smokeMode;

        private string ProfilePath => Path.Combine(Application.persistentDataPath, "profile.json");
        private string ChessPath => Path.Combine(Application.persistentDataPath, "chess.json");

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void StartApp()
        {
            if (FindFirstObjectByType<ArenaApp>() != null) return;
            var root = new GameObject("Mashup Arena");
            DontDestroyOnLoad(root);
            root.AddComponent<ArenaApp>();
        }

        private void Awake()
        {
            // The authored Home is visible in the Editor. Runtime rebuilds it
            // with the saved local profile so the preview is never duplicated.
            var authoredHome = transform.Find("3D screen: Home");
            if (authoredHome != null) screenRoot = authoredHome.gameObject;
            smokeMode = Array.IndexOf(Environment.GetCommandLineArgs(), "--smoke-test") >= 0;
            profile = LoadProfile();
            chess = smokeMode ? null : LoadChess();
            editingName = profile.displayName;
            SceneManager.sceneLoaded += OnSceneLoaded;
            BuildScreen(ScreenId.Home);
            if (smokeMode)
                StartCoroutine(SmokeTest());
        }

        private void OnDestroy()
        {
            SceneManager.sceneLoaded -= OnSceneLoaded;
        }

#if UNITY_EDITOR
        public void GenerateEditorHome()
        {
            profile = new LocalProfile();
            editingName = profile.displayName;
            BuildScreen(ScreenId.Home);
        }
#endif

        private void OnSceneLoaded(Scene scene, LoadSceneMode mode)
        {
            BuildScreen(ScreenId.Home);
        }

        private LocalProfile LoadProfile()
        {
            try
            {
                if (File.Exists(ProfilePath))
                {
                    var loaded = JsonUtility.FromJson<LocalProfile>(File.ReadAllText(ProfilePath));
                    if (loaded != null)
                    {
                        loaded.displayName = CleanName(loaded.displayName);
                        loaded.colorIndex = Mathf.Clamp(loaded.colorIndex, 0, AvatarColors.Length - 1);
                        return loaded;
                    }
                }
            }
            catch (Exception error)
            {
                Debug.LogWarning("Could not load local profile: " + error.Message);
            }
            return new LocalProfile();
        }

        private void SaveProfile()
        {
            profile.displayName = CleanName(editingName);
            try
            {
                Directory.CreateDirectory(Application.persistentDataPath);
                var temporary = ProfilePath + ".tmp";
                File.WriteAllText(temporary, JsonUtility.ToJson(profile, true));
                if (File.Exists(ProfilePath)) File.Replace(temporary, ProfilePath, null);
                else File.Move(temporary, ProfilePath);
            }
            catch (Exception error)
            {
                Debug.LogError("Could not save local profile: " + error.Message);
            }
        }

        private ChessPosition LoadChess()
        {
            try
            {
                if (File.Exists(ChessPath))
                    return ChessRules.Restore(JsonUtility.FromJson<ChessSnapshot>(File.ReadAllText(ChessPath)));
            }
            catch (Exception error)
            {
                Debug.LogWarning("Could not restore Chess session; original save retained: " + error.Message);
            }
            return null;
        }

        private void SaveChess()
        {
            if (chess == null || smokeMode) return;
            try
            {
                Directory.CreateDirectory(Application.persistentDataPath);
                var temporary = ChessPath + ".tmp";
                File.WriteAllText(temporary, JsonUtility.ToJson(ChessRules.Capture(chess), true));
                if (File.Exists(ChessPath)) File.Replace(temporary, ChessPath, null);
                else File.Move(temporary, ChessPath);
            }
            catch (Exception error)
            {
                Debug.LogError("Could not save Chess session: " + error.Message);
            }
        }

        private static string CleanName(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return "Player";
            value = value.Trim();
            return value.Length > 18 ? value.Substring(0, 18) : value;
        }

        private void BuildScreen(ScreenId next)
        {
            if (screenRoot != null) Destroy(screenRoot);
            foreach (var material in screenMaterials) Destroy(material);
            screenMaterials.Clear();
            foreach (var camera in FindObjectsByType<Camera>(FindObjectsSortMode.None))
                camera.enabled = false;
            foreach (var listener in FindObjectsByType<AudioListener>(FindObjectsSortMode.None))
                listener.enabled = false;

            screen = next;
            actions.Clear();
            hovered = null;
            keyboardSelection = 0;
            screenRoot = new GameObject("3D screen: " + screen);
            screenRoot.transform.SetParent(transform, false);
            mainCamera = new GameObject("Arena Camera").AddComponent<Camera>();
            mainCamera.transform.SetParent(screenRoot.transform, false);
            mainCamera.clearFlags = CameraClearFlags.SolidColor;
            mainCamera.backgroundColor = new Color(0.035f, 0.045f, 0.13f);
            mainCamera.fieldOfView = 60f;
            mainCamera.nearClipPlane = 0.05f;
            mainCamera.farClipPlane = 150f;
            mainCamera.tag = "MainCamera";
            mainCamera.gameObject.AddComponent<AudioListener>();

            CreateLight(new Vector3(-4f, 7f, 5f), new Color(0.56f, 0.84f, 1f), 3.2f);
            CreateLight(new Vector3(5f, 4f, -3f), new Color(1f, 0.32f, 0.70f), 2.2f);
            RenderSettings.ambientLight = new Color(0.39f, 0.45f, 0.58f);

            if (next == ScreenId.Hub) BuildHub();
            else if (next == ScreenId.ChessRoom) BuildChessRoom();
            else BuildMenuScreen(next);
        }

        private void CreateLight(Vector3 position, Color color, float intensity)
        {
            var light = new GameObject("Soft stage light").AddComponent<Light>();
            light.transform.SetParent(screenRoot.transform, false);
            light.transform.localPosition = position;
            light.type = LightType.Point;
            light.range = 20f;
            light.intensity = intensity;
            light.color = color;
        }

        private void BuildMenuScreen(ScreenId id)
        {
            mainCamera.transform.position = new Vector3(0f, 2.1f, 11f);
            mainCamera.transform.LookAt(new Vector3(0f, 1.4f, 0f));
            CreateStage();
            CreateText("MASHUP ARENA", new Vector3(-2.8f, 3.45f, 2.2f), 0.34f,
                new Color(1f, 0.94f, 0.48f), TextAnchor.MiddleCenter);

            switch (id)
            {
                case ScreenId.Home:
                    CreateText("YOUR ARCADE. YOUR RULES.", new Vector3(-2.7f, 2.82f, 2.2f),
                        0.15f, Color.white, TextAnchor.MiddleCenter);
                    CreateButton("PLAY", "play", new Vector3(-2.8f, 1.85f, 2.5f), 3.4f);
                    CreateButton("CUSTOMIZATION", "customization", new Vector3(-2.8f, 1.10f, 2.5f), 3.4f);
                    CreateButton("SETTINGS", "settings", new Vector3(-2.8f, 0.35f, 2.5f), 3.4f);
                    CreateButton("QUIT GAME", "quit", new Vector3(-2.8f, -0.40f, 2.5f), 3.4f);
                    CreateAvatar(new Vector3(2.6f, -0.45f, 0.7f), 1.25f);
                    break;

                case ScreenId.Customization:
                    CreateText("CUSTOMIZATION", new Vector3(-2.8f, 2.72f, 2.2f), 0.20f,
                        Color.white, TextAnchor.MiddleCenter);
                    CreateText("Name: edit in the upper-left panel", new Vector3(-2.8f, 2.15f, 2.2f),
                        0.13f, Color.white, TextAnchor.MiddleCenter);
                    CreateButton("PREVIOUS COLOR", "color-prev", new Vector3(-2.8f, 1.15f, 2.5f), 3.4f);
                    CreateButton("NEXT COLOR", "color-next", new Vector3(-2.8f, 0.4f, 2.5f), 3.4f);
                    CreateButton("TOGGLE HAT", "hat", new Vector3(-2.8f, -0.35f, 2.5f), 3.4f);
                    CreateButton("SAVE & BACK", "save", new Vector3(-2.8f, -0.92f, 2.5f), 3.4f);
                    CreateAvatar(new Vector3(2.6f, -0.45f, 0.7f), 1.25f);
                    break;

                case ScreenId.Settings:
                    CreateText("SETTINGS", new Vector3(-2.8f, 2.72f, 2.2f), 0.23f,
                        Color.white, TextAnchor.MiddleCenter);
                    CreateButton(profile.reducedMotion ? "REDUCED MOTION: ON" : "REDUCED MOTION: OFF",
                        "motion", new Vector3(-2.8f, 1.2f, 2.5f), 4f);
                    CreateButton("BACK", "home", new Vector3(-2.8f, 0.35f, 2.5f), 3.4f);
                    CreateAvatar(new Vector3(2.6f, -0.45f, 0.7f), 1.25f);
                    break;
            }
        }

        private void CreateStage()
        {
            CreateBlock("Floor", PrimitiveType.Cube, new Vector3(0f, -1.35f, 0f),
                new Vector3(30f, 0.35f, 23f), new Color(0.08f, 0.10f, 0.23f));
            CreateBlock("Backdrop", PrimitiveType.Cube, new Vector3(0f, 2f, -3.5f),
                new Vector3(18f, 8f, 0.2f), new Color(0.11f, 0.06f, 0.24f));
            for (int i = -3; i <= 3; i++)
            {
                var tint = i % 2 == 0 ? new Color(0.06f, 0.80f, 0.86f) : new Color(0.95f, 0.25f, 0.60f);
                CreateBlock("Arcade light", PrimitiveType.Cylinder, new Vector3(i * 2.1f, 3.9f, -3.15f),
                    new Vector3(0.13f, 0.09f, 0.13f), tint);
            }
            CreateBlock("Podium", PrimitiveType.Cylinder, new Vector3(2.6f, -1.08f, 0.7f),
                new Vector3(2.5f, 0.23f, 2.5f), new Color(0.74f, 0.47f, 0.89f));
        }

        private void BuildHub()
        {
            mainCamera.transform.position = hubSpawn;
            mainCamera.transform.rotation = Quaternion.Euler(0f, 180f, 0f);
            lookYaw = 180f;
            CreateStage();
            CreateText("GAME HUB", new Vector3(0f, 3.8f, -2.8f), 0.31f,
                new Color(1f, 0.94f, 0.48f), TextAnchor.MiddleCenter);
            CreateText("WASD to walk closer  |  Click the sign  |  Esc for Home",
                new Vector3(0f, 3.2f, -2.8f), 0.14f, Color.white, TextAnchor.MiddleCenter);
            CreateBlock("Chess portal", PrimitiveType.Cube, new Vector3(0f, 0.9f, -2.7f),
                new Vector3(4f, 3.4f, 0.4f), new Color(0.14f, 0.45f, 0.55f));
            CreateButton("CHESS VS BOT", "chess", new Vector3(0f, 1.15f, -2.35f), 3.3f);
            CreateText("Walk closer to enter", new Vector3(0f, 0.47f, -2.3f),
                0.13f, Color.white, TextAnchor.MiddleCenter);
            CreateButton("HOME", "home", new Vector3(-4.8f, 1.1f, 0f), 1.9f);
            CreateAvatar(new Vector3(2.6f, -0.59f, 0.7f), 0.75f);
        }

        private void BuildChessRoom()
        {
            if (chess == null) chess = ChessRules.NewGame();
            mainCamera.transform.position = chessFocus ? new Vector3(0f, 4.6f, 7.6f) :
                new Vector3(0f, 1.7f, 7f);
            mainCamera.transform.LookAt(new Vector3(0f, 0f, 0f));
            CreateStage();
            CreateText("CHESS VS BOT", new Vector3(0f, 3.75f, 2.2f),
                0.23f, Color.white, TextAnchor.MiddleCenter);
            CreateText("Click your piece, then a glowing square  |  F: focus/free view",
                new Vector3(0f, 3.3f, 2.2f), 0.12f, Color.white, TextAnchor.MiddleCenter);
            CreateBlock("Board table", PrimitiveType.Cube, new Vector3(0f, -0.36f, 0f),
                new Vector3(5.3f, 0.25f, 5.3f), new Color(0.37f, 0.20f, 0.11f));
            for (int rank = 0; rank < 8; rank++)
                for (int file = 0; file < 8; file++)
                {
                    var square = rank * 8 + file;
                    var tile = CreateBlock("Square " + ChessRules.SquareName(square), PrimitiveType.Cube,
                        ChessWorld(square) + new Vector3(0f, -0.17f, 0f),
                        new Vector3(0.60f, 0.07f, 0.60f),
                        (file + rank) % 2 == 0 ? new Color(0.85f, 0.80f, 0.64f) : new Color(0.10f, 0.42f, 0.48f));
                    tile.AddComponent<ChessSquareTarget>().square = square;
                    chessSquares[square] = tile.GetComponent<Renderer>();
                    if (chess.Board[square].HasValue)
                        CreateChessPiece(square, chess.Board[square].Value);
                }
            RefreshChessHighlights();
            CreateButton("BACK TO HUB", "hub", new Vector3(0f, -0.7f, 3.3f), 3.3f);
            if (chess.Result == ChessResult.None && chess.Turn == ChessSide.Black && !botThinking)
                StartCoroutine(BotChessMove());
        }

        private static Vector3 ChessWorld(int square)
        {
            return new Vector3((3.5f - square % 8) * 0.6f, 0f,
                (3.5f - square / 8) * 0.6f);
        }

        private void CreateChessPiece(int square, ChessPiece piece)
        {
            var root = new GameObject(piece.Side + " " + piece.Kind + " " + ChessRules.SquareName(square));
            root.transform.SetParent(screenRoot.transform, false);
            root.transform.localPosition = ChessWorld(square);
            root.AddComponent<ChessSquareTarget>().square = square;
            var body = piece.Side == ChessSide.White ? new Color(0.98f, 0.91f, 0.73f) :
                new Color(0.22f, 0.19f, 0.40f);
            var baseShape = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            baseShape.name = "Piece base";
            baseShape.transform.SetParent(root.transform, false);
            baseShape.transform.localPosition = new Vector3(0f, 0.04f, 0f);
            baseShape.transform.localScale = new Vector3(0.39f, 0.12f, 0.39f);
            baseShape.GetComponent<Renderer>().material = MakeMaterial(body);
            var crown = GameObject.CreatePrimitive(piece.Kind == ChessKind.Rook ||
                piece.Kind == ChessKind.King ? PrimitiveType.Cube : PrimitiveType.Sphere);
            crown.name = "Piece " + piece.Kind;
            crown.transform.SetParent(root.transform, false);
            crown.transform.localPosition = new Vector3(0f, 0.36f, 0f);
            var height = piece.Kind == ChessKind.King ? 0.62f :
                piece.Kind == ChessKind.Queen ? 0.54f :
                piece.Kind == ChessKind.Pawn ? 0.31f : 0.45f;
            crown.transform.localScale = new Vector3(0.28f, height, 0.28f);
            crown.GetComponent<Renderer>().material = MakeMaterial(body);
            if (piece.Kind != ChessKind.Pawn)
            {
                var initial = piece.Kind == ChessKind.Knight ? "N" :
                    piece.Kind.ToString().Substring(0, 1);
                var label = CreateText(initial,
                    root.transform.position + new Vector3(0f, 0.62f, 0.05f),
                    0.10f, piece.Side == ChessSide.White ? Color.white :
                        new Color(0.88f, 0.68f, 1f), TextAnchor.MiddleCenter);
                label.transform.SetParent(root.transform, true);
            }
        }

        private void RefreshChessHighlights()
        {
            if (chess == null) return;
            var destinations = new HashSet<int>();
            if (selectedChessSquare >= 0)
                foreach (var move in ChessRules.LegalMoves(chess))
                    if (move.From == selectedChessSquare) destinations.Add(move.To);
            for (var square = 0; square < 64; square++)
            {
                var renderer = chessSquares[square];
                if (renderer == null) continue;
                var baseColor = (square % 8 + square / 8) % 2 == 0 ?
                    new Color(0.85f, 0.80f, 0.64f) : new Color(0.10f, 0.42f, 0.48f);
                if (lastChessMove.HasValue &&
                    (lastChessMove.Value.From == square || lastChessMove.Value.To == square))
                    baseColor = new Color(0.63f, 0.66f, 0.24f);
                if (destinations.Contains(square)) baseColor = new Color(0.22f, 0.86f, 0.37f);
                if (square == selectedChessSquare) baseColor = new Color(0.98f, 0.72f, 0.17f);
                renderer.material.color = baseColor;
            }
        }

        private void CreateAvatar(Vector3 origin, float scale)
        {
            var root = new GameObject("Local avatar");
            root.transform.SetParent(screenRoot.transform, false);
            root.transform.localPosition = origin;
            root.transform.localScale = Vector3.one * scale;
            avatar = root.transform;
            var bodyColor = AvatarColors[profile.colorIndex];
            CreateAvatarPart(root.transform, "Body", PrimitiveType.Capsule, new Vector3(0f, 1.2f, 0f),
                new Vector3(0.85f, 1.1f, 0.7f), bodyColor);
            CreateAvatarPart(root.transform, "Head", PrimitiveType.Sphere, new Vector3(0f, 2.4f, 0f),
                Vector3.one * 0.96f, new Color(1f, 0.86f, 0.66f));
            CreateAvatarPart(root.transform, "Left eye", PrimitiveType.Sphere,
                new Vector3(-0.18f, 2.48f, 0.44f), Vector3.one * 0.10f, new Color(0.08f, 0.11f, 0.19f));
            CreateAvatarPart(root.transform, "Right eye", PrimitiveType.Sphere,
                new Vector3(0.18f, 2.48f, 0.44f), Vector3.one * 0.10f, new Color(0.08f, 0.11f, 0.19f));
            CreateAvatarPart(root.transform, "Left arm", PrimitiveType.Capsule,
                new Vector3(-0.6f, 1.35f, 0f), new Vector3(0.25f, 0.75f, 0.25f), bodyColor);
            CreateAvatarPart(root.transform, "Right arm", PrimitiveType.Capsule,
                new Vector3(0.6f, 1.35f, 0f), new Vector3(0.25f, 0.75f, 0.25f), bodyColor);
            CreateAvatarPart(root.transform, "Left leg", PrimitiveType.Capsule,
                new Vector3(-0.21f, 0.08f, 0f), new Vector3(0.25f, 0.35f, 0.25f),
                new Color(0.16f, 0.19f, 0.34f));
            CreateAvatarPart(root.transform, "Right leg", PrimitiveType.Capsule,
                new Vector3(0.21f, 0.08f, 0f), new Vector3(0.25f, 0.35f, 0.25f),
                new Color(0.16f, 0.19f, 0.34f));
            if (profile.wearingHat)
                CreateAvatarPart(root.transform, "Hat", PrimitiveType.Cylinder,
                    new Vector3(0f, 2.94f, 0f), new Vector3(1.12f, 0.19f, 1.12f),
                    new Color(0.22f, 0.15f, 0.42f));
            nameLabel = CreateText(profile.displayName, origin + new Vector3(0f, 3.25f * scale, 0f),
                0.14f, Color.white, TextAnchor.MiddleCenter);
        }

        private void CreateAvatarPart(Transform parent, string name, PrimitiveType type,
            Vector3 position, Vector3 scale, Color color)
        {
            var part = GameObject.CreatePrimitive(type);
            part.name = name;
            part.transform.SetParent(parent, false);
            part.transform.localPosition = position;
            part.transform.localScale = scale;
            part.GetComponent<Renderer>().material = MakeMaterial(color);
            var collider = part.GetComponent<Collider>();
            if (collider != null) Destroy(collider);
        }

        private GameObject CreateBlock(string name, PrimitiveType type, Vector3 position,
            Vector3 scale, Color color)
        {
            var block = GameObject.CreatePrimitive(type);
            block.name = name;
            block.transform.SetParent(screenRoot.transform, false);
            block.transform.localPosition = position;
            block.transform.localScale = scale;
            block.GetComponent<Renderer>().material = MakeMaterial(color);
            return block;
        }

        private Material MakeMaterial(Color color)
        {
            var template = Resources.Load<Material>("ArenaMaterial");
            if (template == null)
                throw new InvalidOperationException("Required Resources/ArenaMaterial is missing from the build.");
            var material = new Material(template);
            material.color = color;
            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", color);
            screenMaterials.Add(material);
            return material;
        }

        private TextMesh CreateText(string value, Vector3 position, float size, Color color, TextAnchor anchor)
        {
            var textObject = new GameObject("3D text: " + value);
            textObject.transform.SetParent(screenRoot.transform, false);
            textObject.transform.localPosition = position;
            textObject.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            var mesh = textObject.AddComponent<TextMesh>();
            mesh.text = value;
            mesh.fontSize = 72;
            mesh.characterSize = size * 0.24f;
            mesh.anchor = anchor;
            mesh.alignment = TextAlignment.Center;
            mesh.color = color;
            return mesh;
        }

        private void CreateButton(string label, string id, Vector3 position, float width)
        {
            var color = new Color(0.24f, 0.14f, 0.50f);
            var block = CreateBlock("Action: " + label, PrimitiveType.Cube, position,
                new Vector3(width, 0.53f, 0.25f), color);
            var action = block.AddComponent<ArenaAction>();
            action.id = id;
            action.normalColor = color;
            action.surface = block.GetComponent<Renderer>();
            actions.Add(action);
            var text = CreateText(label, position + new Vector3(0f, 0f, 0.14f),
                0.16f, Color.white, TextAnchor.MiddleCenter);
            text.transform.SetParent(block.transform, true);
        }

        private void Update()
        {
            var keyboard = Keyboard.current;
            var mouse = Mouse.current;
            if (keyboard != null && keyboard.escapeKey.wasPressedThisFrame)
            {
                if (screen != ScreenId.Home) BuildScreen(screen == ScreenId.ChessRoom ? ScreenId.Hub : ScreenId.Home);
                return;
            }

            if (screen == ScreenId.Hub) MoveInHub(keyboard);
            if (screen == ScreenId.ChessRoom && keyboard != null && keyboard.fKey.wasPressedThisFrame)
            {
                chessFocus = !chessFocus;
                BuildScreen(ScreenId.ChessRoom);
            }
            if (screen == ScreenId.ChessRoom && !chessFocus) MoveInChessRoom(keyboard);
            if (avatar != null && !profile.reducedMotion)
                avatar.Rotate(Vector3.up, 12f * Time.deltaTime, Space.World);

            ArenaAction pointerTarget = null;
            ChessSquareTarget chessTarget = null;
            if (mouse != null && mainCamera != null)
            {
                var ray = mainCamera.ScreenPointToRay(mouse.position.ReadValue());
                if (Physics.Raycast(ray, out var hit, 100f))
                {
                    pointerTarget = hit.collider.GetComponent<ArenaAction>();
                    chessTarget = hit.collider.GetComponentInParent<ChessSquareTarget>();
                }
            }

            if (keyboard != null && keyboard.tabKey.wasPressedThisFrame && actions.Count > 0)
                keyboardSelection = (keyboardSelection + 1) % actions.Count;
            var selected = pointerTarget != null ? pointerTarget :
                actions.Count > 0 ? actions[keyboardSelection] : null;
            if (hovered != selected)
            {
                if (hovered != null) hovered.SetHighlighted(false);
                hovered = selected;
                if (hovered != null) hovered.SetHighlighted(true);
            }

            if (screen == ScreenId.ChessRoom && chessTarget != null && mouse != null &&
                mouse.leftButton.wasPressedThisFrame && promotionChoices == null)
                HandleChessClick(chessTarget.square);
            else if (pointerTarget != null && mouse != null && mouse.leftButton.wasPressedThisFrame)
                Activate(pointerTarget.id);
            else if (keyboard != null && keyboard.enterKey.wasPressedThisFrame && actions.Count > 0)
                Activate(actions[keyboardSelection].id);
        }

        private void MoveInHub(Keyboard keyboard)
        {
            if (keyboard == null) return;
            var x = (keyboard.dKey.isPressed ? 1f : 0f) - (keyboard.aKey.isPressed ? 1f : 0f);
            var z = (keyboard.wKey.isPressed ? 1f : 0f) - (keyboard.sKey.isPressed ? 1f : 0f);
            var turn = (keyboard.rightArrowKey.isPressed ? 1f : 0f) -
                (keyboard.leftArrowKey.isPressed ? 1f : 0f);
            lookYaw += turn * 90f * Time.deltaTime;
            mainCamera.transform.rotation = Quaternion.Euler(0f, lookYaw, 0f);
            var motion = (mainCamera.transform.right * x + mainCamera.transform.forward * z).normalized;
            motion.y = 0f;
            var target = mainCamera.transform.position + motion * 3f * Time.deltaTime;
            target.x = Mathf.Clamp(target.x, -7f, 7f);
            target.z = Mathf.Clamp(target.z, -1f, 10f);
            mainCamera.transform.position = target;
        }

        private void MoveInChessRoom(Keyboard keyboard)
        {
            if (keyboard == null) return;
            var x = (keyboard.dKey.isPressed ? 1f : 0f) - (keyboard.aKey.isPressed ? 1f : 0f);
            var z = (keyboard.wKey.isPressed ? 1f : 0f) - (keyboard.sKey.isPressed ? 1f : 0f);
            var motion = (mainCamera.transform.right * x + mainCamera.transform.forward * z).normalized;
            motion.y = 0f;
            var target = mainCamera.transform.position + motion * 3f * Time.deltaTime;
            target.x = Mathf.Clamp(target.x, -7f, 7f);
            target.z = Mathf.Clamp(target.z, -7f, 9f);
            if (Mathf.Abs(target.x) < 2.9f && Mathf.Abs(target.z) < 2.9f)
                return; // Keep the camera outside the chess table.
            mainCamera.transform.position = target;
        }

        private void HandleChessClick(int square)
        {
            if (chess == null || chess.Result != ChessResult.None ||
                chess.Turn != ChessSide.White || botThinking) return;
            if (selectedChessSquare >= 0)
            {
                var choices = new List<ChessMove>();
                foreach (var move in ChessRules.LegalMoves(chess))
                    if (move.From == selectedChessSquare && move.To == square) choices.Add(move);
                if (choices.Count == 1)
                {
                    ApplyChessMove(choices[0]);
                    return;
                }
                if (choices.Count > 1)
                {
                    promotionChoices = choices;
                    return;
                }
            }
            var piece = chess.Board[square];
            selectedChessSquare = piece.HasValue && piece.Value.Side == ChessSide.White ? square : -1;
            RefreshChessHighlights();
        }

        private void ApplyChessMove(ChessMove move)
        {
            chess = ChessRules.ApplyMove(chess, move);
            SaveChess();
            lastChessMove = move;
            selectedChessSquare = -1;
            promotionChoices = null;
            BuildScreen(ScreenId.ChessRoom);
        }

        private IEnumerator BotChessMove()
        {
            botThinking = true;
            var expectedPosition = chess;
            yield return new WaitForSeconds(0.55f);
            if (screen == ScreenId.ChessRoom && ReferenceEquals(chess, expectedPosition) &&
                chess.Result == ChessResult.None && chess.Turn == ChessSide.Black)
            {
                var legal = ChessRules.LegalMoves(chess);
                if (legal.Count > 0)
                {
                    var best = legal[0];
                    var bestScore = int.MinValue;
                    foreach (var move in legal)
                    {
                        var captured = chess.Board[move.To];
                        var score = captured.HasValue ? PieceValue(captured.Value.Kind) : 0;
                        score += move.Promotion == ChessKind.Queen ? 80 : 0;
                        score += UnityEngine.Random.Range(0, 8);
                        if (score > bestScore) { bestScore = score; best = move; }
                    }
                    chess = ChessRules.ApplyMove(chess, best);
                    SaveChess();
                    lastChessMove = best;
                    BuildScreen(ScreenId.ChessRoom);
                }
            }
            botThinking = false;
        }

        private static int PieceValue(ChessKind kind)
        {
            switch (kind)
            {
                case ChessKind.Queen: return 90;
                case ChessKind.Rook: return 50;
                case ChessKind.Bishop: return 30;
                case ChessKind.Knight: return 30;
                case ChessKind.Pawn: return 10;
                default: return 0;
            }
        }

        private void Activate(string id)
        {
            if (screen == ScreenId.Hub && id == "chess" &&
                Vector3.Distance(mainCamera.transform.position, new Vector3(0f, 1.15f, -2.35f)) > 5.5f)
                return;
            switch (id)
            {
                case "play": BuildScreen(ScreenId.Hub); break;
                case "customization": editingName = profile.displayName; BuildScreen(ScreenId.Customization); break;
                case "settings": BuildScreen(ScreenId.Settings); break;
                case "home": BuildScreen(ScreenId.Home); break;
                case "hub": BuildScreen(ScreenId.Hub); break;
                case "chess": if (chess == null) chess = ChessRules.NewGame();
                    selectedChessSquare = -1; lastChessMove = null;
                    chessFocus = true; botThinking = false;
                    BuildScreen(ScreenId.ChessRoom); break;
                case "color-prev": profile.colorIndex = (profile.colorIndex + AvatarColors.Length - 1) % AvatarColors.Length;
                    BuildScreen(ScreenId.Customization); break;
                case "color-next": profile.colorIndex = (profile.colorIndex + 1) % AvatarColors.Length;
                    BuildScreen(ScreenId.Customization); break;
                case "hat": profile.wearingHat = !profile.wearingHat; BuildScreen(ScreenId.Customization); break;
                case "motion": profile.reducedMotion = !profile.reducedMotion; SaveProfile();
                    BuildScreen(ScreenId.Settings); break;
                case "save": SaveProfile(); BuildScreen(ScreenId.Home); break;
                case "quit": Application.Quit(); break;
            }
        }

        private void OnGUI()
        {
            if (screen == ScreenId.ChessRoom)
            {
                DrawChessHud();
                return;
            }
            if (screen != ScreenId.Customization) return;
            const int width = 380;
            GUILayout.BeginArea(new Rect(18, 18, width, 110), GUI.skin.box);
            GUILayout.Label("LOCAL PLAYER NAME");
            editingName = GUILayout.TextField(editingName ?? "", 18);
            GUILayout.Label("Saved only on this PC. Choose a color and hat in the 3D scene.");
            GUILayout.EndArea();
        }

        private void DrawChessHud()
        {
            if (chess == null) return;
            GUILayout.BeginArea(new Rect(16, 16, 320, 135), GUI.skin.box);
            var status = chess.Result == ChessResult.None ?
                (chess.Turn == ChessSide.White ? "YOUR TURN - WHITE" : "BOT THINKING - BLACK") :
                chess.Result == ChessResult.Draw ? "DRAW" :
                chess.Result == ChessResult.WhiteWin ? "VICTORY" : "DEFEAT";
            GUILayout.Label(status + (chess.InCheck ? "  |  CHECK" : ""));
            GUILayout.Label("Move " + chess.FullmoveNumber + "  |  " +
                (lastChessMove.HasValue ? "Last: " + lastChessMove.Value : "Select a white piece"));
            GUILayout.BeginHorizontal();
            if (GUILayout.Button(chessFocus ? "Free view (F)" : "Focus board (F)"))
            { chessFocus = !chessFocus; BuildScreen(ScreenId.ChessRoom); }
            if (GUILayout.Button("New game"))
            { chess = ChessRules.NewGame(); lastChessMove = null; selectedChessSquare = -1;
              promotionChoices = null; botThinking = false; SaveChess();
              BuildScreen(ScreenId.ChessRoom); }
            GUILayout.EndHorizontal();
            if (GUILayout.Button("Back to hub")) BuildScreen(ScreenId.Hub);
            GUILayout.EndArea();

            if (promotionChoices != null && promotionChoices.Count > 0)
            {
                var width = 360f;
                GUILayout.BeginArea(new Rect((Screen.width - width) / 2f, Screen.height / 2f - 65f,
                    width, 130f), GUI.skin.window);
                GUILayout.Label("CHOOSE PROMOTION");
                GUILayout.BeginHorizontal();
                foreach (var choice in promotionChoices)
                    if (GUILayout.Button(choice.Promotion.ToString()))
                    { ApplyChessMove(choice); break; }
                GUILayout.EndHorizontal();
                GUILayout.EndArea();
            }
            else if (chess.Result != ChessResult.None)
            {
                GUILayout.BeginArea(new Rect(Screen.width / 2f - 180f,
                    Screen.height / 2f - 45f, 360f, 90f), GUI.skin.window);
                GUILayout.Label(status + " - " + chess.ResultReason);
                if (GUILayout.Button("Play again"))
                { chess = ChessRules.NewGame(); lastChessMove = null;
                  selectedChessSquare = -1; SaveChess(); BuildScreen(ScreenId.ChessRoom); }
                GUILayout.EndArea();
            }
        }

        private IEnumerator SmokeTest()
        {
            var screenshot = Environment.GetEnvironmentVariable("MASHUP_UNITY_SCREENSHOT");
            var screens = new[]
            {
                ScreenId.Home, ScreenId.Customization, ScreenId.Hub, ScreenId.ChessRoom
            };
            foreach (var targetScreen in screens)
            {
                if (screen != targetScreen) BuildScreen(targetScreen);
                yield return new WaitForEndOfFrame();
                if (!string.IsNullOrEmpty(screenshot))
                {
                    var destination = targetScreen == ScreenId.Home ? screenshot :
                        Path.Combine(Path.GetDirectoryName(screenshot) ?? "",
                            Path.GetFileNameWithoutExtension(screenshot) + "-" +
                            targetScreen.ToString().ToLowerInvariant() + ".png");
                    CaptureCamera(destination);
                }
            }
            AssertChessRayTarget(12, 0.42f);
            AssertChessRayTarget(28, -0.12f);
            HandleChessClick(12); // e2
            if (selectedChessSquare != 12)
                throw new InvalidOperationException("Smoke test could not select the white pawn.");
            HandleChessClick(28); // e4
            if (!chess.Board[28].HasValue || chess.Board[28].Value.Kind != ChessKind.Pawn ||
                chess.Turn != ChessSide.Black)
                throw new InvalidOperationException("Smoke test could not play e2-e4.");
            yield return new WaitForSeconds(0.8f);
            if (chess.Result == ChessResult.None && chess.Turn != ChessSide.White)
                throw new InvalidOperationException("Smoke test bot did not answer.");
            var marker = Environment.GetEnvironmentVariable("MASHUP_UNITY_SMOKE_MARKER");
            if (!string.IsNullOrEmpty(marker))
                File.WriteAllText(marker, "{\"renderer\":true,\"screens\":4,\"chessMove\":true,\"botMove\":true}");
            Application.Quit();
        }

        private void AssertChessRayTarget(int square, float height)
        {
            var point = ChessWorld(square) + new Vector3(0f, height, 0f);
            var screenPoint = mainCamera.WorldToScreenPoint(point);
            var ray = mainCamera.ScreenPointToRay(screenPoint);
            if (screenPoint.z <= 0f || !Physics.Raycast(ray, out var hit, 100f) ||
                hit.collider.GetComponentInParent<ChessSquareTarget>()?.square != square)
                throw new InvalidOperationException("Chess square is not clickable: " +
                    ChessRules.SquareName(square));
        }

        private void CaptureCamera(string destination)
        {
            const int width = 1280;
            const int height = 720;
            var target = new RenderTexture(width, height, 24);
            var pixels = new Texture2D(width, height, TextureFormat.RGB24, false);
            var previous = RenderTexture.active;
            try
            {
                mainCamera.targetTexture = target;
                mainCamera.Render();
                RenderTexture.active = target;
                pixels.ReadPixels(new Rect(0, 0, width, height), 0, 0);
                pixels.Apply();
                File.WriteAllBytes(destination, pixels.EncodeToPNG());
            }
            finally
            {
                mainCamera.targetTexture = null;
                RenderTexture.active = previous;
                Destroy(target);
                Destroy(pixels);
            }
        }
    }
}
