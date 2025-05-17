plugins {
    kotlin("jvm") version "1.9.0"
    id("org.jetbrains.intellij") version "1.17.3"
}

group = "com.mxo.timetracker"
version = "1.10.03"

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

tasks {
    patchPluginXml {
        changeNotes.set("Auto-refresh duration every 60s for current day")
        sinceBuild.set("241")
        untilBuild.set("999.*")
    }
}