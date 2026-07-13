if (typeof ziaagents === "undefined") {
    var ziaagents = {};
    let versions = {};

    Object.defineProperty(versions, "sdk", {
        value: "164.0.0-AGENTS-beta",
        writable: false
    });

    Object.defineProperty(ziaagents, "versions", {
        value: versions,
        writable: false
    });
}

var scriptTags = document.querySelectorAll("script");
var sdkRegex = /agents-chat-sdk\.js(\?.*)?$/;

var sdkDomainUrl = "";
var sdkBaseOrigin = "";

for (var i = 0; i < scriptTags.length; i++) {

    var scriptSrc = (scriptTags[i].src || "").toString();

    if (sdkRegex.test(scriptSrc)) {

        sdkDomainUrl = scriptSrc.replace(
            /\/assets\/js\/agents-chat-sdk\.js(\?.*)?$/,
            ""
        );

        sdkBaseOrigin = sdkDomainUrl
            .split("/")
            .slice(0, 3)
            .join("/");

        break;
    }
}

Object.defineProperty(ziaagents, "url", {
    value: sdkBaseOrigin,
    writable: false
});

var sdkBasePath = sdkDomainUrl || "";

function buildSdkUrl(path) {

    if (!sdkBasePath) {
        return path;
    }

    if (
        sdkBasePath.charAt(sdkBasePath.length - 1) === "/" &&
        path.charAt(0) === "/"
    ) {
        return sdkBasePath + path.substring(1);
    }

    if (
        sdkBasePath.charAt(sdkBasePath.length - 1) !== "/" &&
        path.charAt(0) !== "/"
    ) {
        return sdkBasePath + "/" + path;
    }

    return sdkBasePath + path;
}

var sdkResources = [
    buildSdkUrl("/assets/js/marked.min.js"),
    buildSdkUrl("/components/javascript/agents-chatkit.js"),
    buildSdkUrl("/components/javascript/agents-chat-bot-comp.js")
];

var lyteDependencyScripts = [];
var isLyteAlreadyLoaded = typeof $L !== "undefined";

if (!isLyteAlreadyLoaded) {

    lyteDependencyScripts.push(
        buildSdkUrl("bower_components/lyte/custom-elements-es5-adapter.js")
    );

    lyteDependencyScripts.push(
        buildSdkUrl("bower_components/lyte/polyfill-bundle.js")
    );

    lyteDependencyScripts.push(
        buildSdkUrl("bower_components/lyte/lyte-es5.js")
    );

    lyteDependencyScripts.push(
        buildSdkUrl("bower_components/lyte/lyte-dom/lyte-dom.js")
    );
}

function loadScriptsSequentially(scriptList, callback) {

    var headElement =
        document.getElementsByTagName("head")[0] ||
        document.documentElement;

    var currentIndex = 0;

    function loadNextScript() {

        if (currentIndex >= scriptList.length) {

            if (typeof callback === "function") {
                callback();
            }

            return;
        }

        var scriptElement = document.createElement("script");

        scriptElement.src = scriptList[currentIndex++];
        scriptElement.async = false;

        scriptElement.onload = loadNextScript;
        scriptElement.onerror = loadNextScript;

        headElement.appendChild(scriptElement);
    }

    loadNextScript();
}

loadScriptsSequentially(lyteDependencyScripts, function () {

    var chatComponentTag =
        document.querySelector("agents-chatkit") ||
        document.querySelector("agents-chat-bot-comp");

    if (chatComponentTag) {

        var ziaAgentsAttribute =
            chatComponentTag.getAttribute("ziaAgents");

        var parsedConfig = {};

        try {
            parsedConfig = Function(
                "return (" + ziaAgentsAttribute + ")"
            )();
        } catch (e) { }

        var organizationId = parsedConfig.orgId || "";
        var deploymentId = parsedConfig.entityId || "";

        var apiOrigin = sdkDomainUrl
            .split("/")
            .slice(0, 3)
            .join("/");

        if (organizationId && deploymentId && apiOrigin) {

            var initApiUrl =
                apiOrigin +
                "/ziaagents/api/v1/chatsdk/webchat/init";

            if (!ziaagents.initialSystemData) {

                ziaagents.initialSystemData = fetch(initApiUrl, {
                    method: "GET",
                    headers: {
                        "X-ZIAAGENTS-ORG": organizationId,
                        "X-ZIAAGENTS-CHATSDK-DEPLOYMENT-ID": deploymentId
                    }
                })
                    .then(function (response) {

                        if (!response.ok) {
                            throw new Error();
                        }

                        return response.json();
                    })
                    .then(function (responseData) {

                        ziaagents.initialSystemDataResolved = responseData;

                        var customThemeColor =
                            (
                                responseData &&
                                responseData.data &&
                                responseData.data.customColorTheme
                            ) || "#6B4EFF";

                        document.documentElement.style.setProperty(
                            "--agents-primary-color",
                            customThemeColor
                        );

                        return responseData;
                    });
            }
        }
    }

    loadScriptsSequentially(sdkResources);

});