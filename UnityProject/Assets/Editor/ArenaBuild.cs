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
    }
}
