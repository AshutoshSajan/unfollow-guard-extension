const st = document.createElement("style");
st.textContent = NFB.themeCSS + NFB.settingsCSS;
document.head.append(st);
document.getElementById("settings").innerHTML = NFB.settingsHTML;
NFB.watchTheme(document.getElementById("app"));
NFB.migrate().then(() => NFB.bindSettings(document));
