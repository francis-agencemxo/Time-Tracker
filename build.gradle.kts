plugins {
    kotlin("jvm") version "1.9.0"
    id("org.jetbrains.intellij") version "1.17.3"
}

group = "com.mxo.timetracker"
version = "1.10.01"

repositories {
    mavenCentral()
}

intellij {
    version.set("2023.3")
    type.set("PS")
    plugins.set(listOf("com.jetbrains.php"))
}

dependencies {
    implementation("org.json:json:20231013")
}

tasks {
    patchPluginXml {
        changeNotes.set("Auto-refresh duration every 60s for current day")
        sinceBuild.set("251")
        untilBuild.set("999.*")
    }
}