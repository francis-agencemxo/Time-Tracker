plugins {
    application
    kotlin("jvm") version "1.9.0"
    id("org.jetbrains.intellij") version "1.17.3"
}

group = "com.codepulse.timetracker"
version = "1.12.8"

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

tasks.processResources {
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
}

tasks.patchPluginXml {
    sinceBuild.set("241")
    untilBuild.set("999.*")
    changeNotes.set("Auto-refresh duration every 60s for current day")
}

tasks.buildPlugin {
    doLast {
        println("✅ Plugin built at: build/distributions/")
    }
}

tasks.jar {
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE

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