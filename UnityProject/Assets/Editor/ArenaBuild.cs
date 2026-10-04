using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
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
    }
}
