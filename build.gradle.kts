plugins {
    application
    kotlin("jvm") version "1.9.0"
    id("org.jetbrains.intellij") version "1.17.3"
}

group = "com.codepulse.timetracker"
version = "2.1.23"

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
    changeNotes.set("Auto-refresh duration every 60s for current day")
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
    workingDir = dashboardDir
    commandLine("npm", "run", "export")
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
