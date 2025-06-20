import org.jetbrains.intellij.tasks.RunIdeTask

plugins {
    application
    kotlin("jvm") version "1.9.0"
    id("org.jetbrains.intellij") version "1.17.3"
}

group = "com.codepulse.timetracker"
version = "2.9.22"

repositories {
    mavenCentral()
}

// optional: a dedicated "runMigration" task
tasks.register<JavaExec>("runMigration") {
    group = "migration"
    description = "Migrate data.json into SQLite"
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("com.codepulse.timetracker.DataMigrationKt")
}

tasks.register<JavaExec>("runTrackerServer") {
    group = "application"
    description = "Run the browsing tracker HTTP API server"
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("com.codepulse.timetracker.BrowsingTrackerServerKt")
}

intellij {
    version.set("2024.1")
    type.set("PS")
    plugins.set(listOf("com.jetbrains.php"))
}

dependencies {
    implementation("org.json:json:20231013")
    implementation("org.xerial:sqlite-jdbc:3.40.0.0")
}

kotlin {
    jvmToolchain {
        // match your IDE’s JBR (Java 17)
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}

// ← this is top‐level, _after_ the plugins block
application {
    // point at your migration “main”
    mainClass.set("com.codepulse.timetracker.DataMigrationKt")
}

sourceSets {
    main {
        resources.srcDirs("src/main/resources") // ✅ This is needed
    }
}

tasks.named("buildSearchableOptions") {
    enabled = false
}

tasks.processResources {
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    exclude("dashboard/**")
}

tasks.patchPluginXml {
    sinceBuild.set("241")
    untilBuild.set("251.*")
}

tasks.buildPlugin {
    doLast {
        println("✅ Plugin built at: build/distributions/")
    }
}

tasks.jar {
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    exclude("dashboard/**")
    from("src/main/resources") {
        include("META-INF/**")
    }
}

tasks {
    // make sure to configure the *existing* prepareSandbox task
    named<org.jetbrains.intellij.tasks.PrepareSandboxTask>("prepareSandbox") {
        // copy the sqlite-jdbc jar from the runtime classpath into plugins/your-plugin/lib
        from(configurations.runtimeClasspath.get()) {
            include("sqlite-jdbc-*.jar")
            into("lib")
        }
    }
}

val dashboardDir = File("src/main/resources/dashboard")
val outputDir = File(dashboardDir, "out")
val pluginPublicDir = File("src/main/resources/public")

tasks.register<Exec>("buildDashboard") {
    onlyIf {
        project.findProperty("dashboardUrl") == null && System.getenv("DASHBOARD_URL") == null
    }
    workingDir = dashboardDir
    val portValue = project.findProperty("trackerServerPort")?.toString()
        ?: System.getenv("TRACKER_SERVER_PORT")
        ?: "56000"
    environment("TRACKER_SERVER_PORT", portValue)
    environment("NEXT_PUBLIC_TRACKER_SERVER_PORT", portValue)
    commandLine("npm", "run", "export")
}

tasks.withType<RunIdeTask> {
    project.findProperty("trackerServerPort")?.toString()?.let { port ->
        jvmArgs("-DtrackerServerPort=$port")
    }
    project.findProperty("dashboardUrl")?.toString()?.let { url ->
        jvmArgs("-DdashboardUrl=$url")
    }
}

// 1) Stand-alone “clean” task
val cleanDashboardResources = tasks.register<Delete>("cleanDashboardResources") {
    // this calls the Script.fileTree(vararg Pair<String,Any?>) overload
    delete(
        fileTree(
            "dir"     to pluginPublicDir,
            "include" to "**/*"
        )
    )
}

tasks.register<Copy>("copyDashboardToResources") {
    onlyIf {
        project.findProperty("dashboardUrl") == null && System.getenv("DASHBOARD_URL") == null
    }
    dependsOn("buildDashboard")
    from(outputDir)
    into(pluginPublicDir)

    // before copying, wipe out everything under pluginPublicDir
    doFirst {
        if (pluginPublicDir.exists()) {
            pluginPublicDir.listFiles()?.forEach { child ->
                // deletes files or whole sub-folders
                child.deleteRecursively()
            }
        }
    }
}

tasks.named("processResources") {
    dependsOn("copyDashboardToResources")
}

tasks.named("buildPlugin") {
    dependsOn("copyDashboardToResources")
}
