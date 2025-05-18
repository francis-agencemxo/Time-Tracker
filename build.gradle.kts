plugins {
    kotlin("jvm") version "1.9.0"
    id("org.jetbrains.intellij") version "1.17.3"
}

group = "com.mxo.timetracker"
version = "1.11.9"

repositories {
    mavenCentral()
}

intellij {
    version.set("2024.1")
    type.set("PS")
    plugins.set(listOf("com.jetbrains.php"))
}

dependencies {
    implementation("org.json:json:20231013")
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