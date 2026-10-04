using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace MashupArena.Editor
{
    public static class ArenaBuild
    {
        private const string ScenePath = "Assets/Scenes/SampleScene.unity";

        [MenuItem("Mashup Arena/Configure Project")]
        public static void ConfigureProject()
        {
            PlayerSettings.companyName = "Mashup Arena";
            PlayerSettings.productName = "Mashup Arena";
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            const string materialPath = "Assets/Resources/ArenaMaterial.mat";
            if (AssetDatabase.LoadAssetAtPath<Material>(materialPath) == null)
            {
                Directory.CreateDirectory("Assets/Resources");
                var shader = Shader.Find("Standard");
                if (shader == null) throw new Exception("Unity Standard shader is unavailable.");
                AssetDatabase.CreateAsset(new Material(shader), materialPath);
                AssetDatabase.SaveAssets();
            }
            Debug.Log("Mashup Arena project configured for Windows x64.");
        }

        [MenuItem("Mashup Arena/Build Windows x64")]
        public static void BuildWindows64()
        {
            ConfigureProject();
            var target = Path.GetFullPath(Path.Combine(Application.dataPath,
                "../Builds/Windows/Mashup Arena.exe"));
            Directory.CreateDirectory(Path.GetDirectoryName(target) ?? throw new Exception("Invalid build path"));
            var options = new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = target,
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.None
            };
            var report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
                throw new Exception("Windows x64 build failed: " + report.summary.result);
            Debug.Log("Mashup Arena Windows build: " + target);
        }

        public static void GenerateHomeScene()
        {
            ConfigureProject();
            var scene = EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
            foreach (var root in scene.GetRootGameObjects())
            {
                if (root.name != "Main Camera" && root.name != "Directional Light")
                    throw new Exception("Home scene already contains content; refusing to replace it: " + root.name);
            }
            foreach (var root in scene.GetRootGameObjects())
                UnityEngine.Object.DestroyImmediate(root);

            var arena = new GameObject("Mashup Arena").AddComponent<ArenaApp>();
            arena.GenerateEditorHome();
            EditorSceneManager.MarkSceneDirty(scene);
            if (!EditorSceneManager.SaveScene(scene))
                throw new Exception("Could not save the authored Home scene.");
            Debug.Log("Mashup Arena Home objects are now visible in the Scene view.");
        }

        [MenuItem("Mashup Arena/Validate Authored Home")]
        public static void ValidateAuthoredHome()
        {
            var scene = EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
            GameObject arena = null;
            foreach (var root in scene.GetRootGameObjects())
                if (root.name == "Mashup Arena") arena = root;
            if (arena == null || arena.GetComponent<ArenaApp>() == null)
                throw new Exception("The saved Home scene has no ArenaApp root.");
            var home = arena.transform.Find("3D screen: Home");
            if (home == null) throw new Exception("The saved Home scene has no 3D objects.");
            var buttons = home.GetComponentsInChildren<ArenaAction>(true);
            if (buttons.Length != 4) throw new Exception("Expected four interactive Home buttons.");
            var renderers = home.GetComponentsInChildren<Renderer>(true);
            if (renderers.Length < 15) throw new Exception("The saved Home scene is incomplete.");
            foreach (var renderer in renderers)
                if (renderer.sharedMaterial == null || renderer.sharedMaterial.shader == null)
                    throw new Exception("The saved Home scene has a missing material: " + renderer.name);
            Debug.Log("PASS: authored Home scene restored with " + renderers.Length +
                " renderers and " + buttons.Length + " buttons.");
        }

        [MenuItem("Mashup Arena/Test Chess Rules")]
        public static void TestChessRules()
        {
            var position = ChessRules.NewGame();
            Assert(ChessRules.LegalMoves(position).Count == 20, "initial legal move count");
            var rejected = false;
            try { ChessRules.ApplyMove(position, new ChessMove(0, 16)); }
            catch (InvalidOperationException) { rejected = true; }
            Assert(rejected, "illegal rook move rejection");

            position = Play(position, 13, 21);
            position = Play(position, 52, 36);
            position = Play(position, 14, 30);
            position = Play(position, 59, 31);
            Assert(position.Result == ChessResult.BlackWin && position.ResultReason == "checkmate",
                "Fool's Mate");

            position = ChessRules.NewGame();
            position = Play(position, 12, 28);
            position = Play(position, 48, 40);
            position = Play(position, 6, 21);
            position = Play(position, 40, 32);
            position = Play(position, 5, 12);
            position = Play(position, 49, 41);
            Assert(HasMove(position, 4, 6), "king-side castling available");
            position = Play(position, 4, 6);
            Assert(position.Board[6].HasValue && position.Board[6].Value.Kind == ChessKind.King &&
                position.Board[5].HasValue && position.Board[5].Value.Kind == ChessKind.Rook,
                "castling moves king and rook");

            position = ChessRules.NewGame();
            position = Play(position, 12, 28);
            position = Play(position, 48, 40);
            position = Play(position, 28, 36);
            position = Play(position, 51, 35);
            Assert(position.EnPassant == 43, "en passant target");
            position = Play(position, 36, 43);
            Assert(!position.Board[35].HasValue && position.Board[43].HasValue &&
                position.Board[43].Value.Kind == ChessKind.Pawn, "en passant capture");

            position = ChessRules.NewGame();
            position.Board = new ChessPiece?[64];
            position.Board[4] = new ChessPiece(ChessSide.White, ChessKind.King);
            position.Board[60] = new ChessPiece(ChessSide.Black, ChessKind.King);
            position.Board[48] = new ChessPiece(ChessSide.White, ChessKind.Pawn);
            position.WhiteKingSide = position.WhiteQueenSide = false;
            position.BlackKingSide = position.BlackQueenSide = false;
            position.PositionCounts.Clear();
            position.PositionCounts[ChessRules.PositionKey(position)] = 1;
            var promotions = 0;
            foreach (var candidate in ChessRules.LegalMoves(position))
                if (candidate.From == 48 && candidate.To == 56) promotions++;
            Assert(promotions == 4, "four promotion choices");
            position = ChessRules.ApplyMove(position, new ChessMove(48, 56, ChessKind.Knight));
            Assert(position.Board[56].HasValue && position.Board[56].Value.Kind == ChessKind.Knight,
                "knight promotion");
            var json = JsonUtility.ToJson(ChessRules.Capture(position));
            var restored = ChessRules.Restore(JsonUtility.FromJson<ChessSnapshot>(json));
            Assert(ChessRules.PositionKey(restored) == ChessRules.PositionKey(position) &&
                restored.Result == position.Result &&
                restored.PositionCounts.Count == position.PositionCounts.Count,
                "Chess save/restore round trip");
            Debug.Log("PASS: Unity Chess rules match TS fixtures (initial, illegal, mate, castle, en passant, promotion, save).");
        }

        private static ChessPosition Play(ChessPosition position, int from, int to)
        {
            return ChessRules.ApplyMove(position, new ChessMove(from, to));
        }

        private static bool HasMove(ChessPosition position, int from, int to)
        {
            foreach (var move in ChessRules.LegalMoves(position))
                if (move.From == from && move.To == to) return true;
            return false;
        }

        private static void Assert(bool condition, string label)
        {
            if (!condition) throw new Exception("Chess rules failed: " + label);
        }
    }
}
