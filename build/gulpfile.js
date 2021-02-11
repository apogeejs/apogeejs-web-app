const { src, dest, series, parallel} = require('gulp');
const concat = require('gulp-concat');
const rollup = require('rollup');
const replace = require('gulp-replace');
const rename = require('gulp-rename');
const path = require('path');
const {getJsFileHeader, getReleaseFolder, makeSureReleaseNotPresent, createResolveAbsoluteUrl, createResolveId} = require("../../apogeejs-admin/build-src/build-utils.js");

const versionConfig = require('../versionConfig.json');

//read data from the release package.json
let isDevRelease = !(versionConfig.isOfficialRelease);
let version = versionConfig.version;
let versionAssetsPath = "/lib/v" + version;
let pathMapping = versionConfig.pathMapping;

let repoName = "apogeejs-web-app";

//for absolute references
const PATH_TO_ABSOLUTE_ROOT = "../..";
let resolveAbsoluteUrl = createResolveAbsoluteUrl(__dirname,PATH_TO_ABSOLUTE_ROOT,pathMapping);
let resolveId = createResolveId(__dirname,PATH_TO_ABSOLUTE_ROOT,pathMapping);

const outputFolder = getReleaseFolder(repoName,version,isDevRelease);

//======================================
// Release Info
//======================================

//base files - version info
const BASE_FILES = [
    "../package.json"
]

let copyReleaseInfoTask = parallel(
    () => copyFilesTask(BASE_FILES,outputFolder)
)

/** This function is a gulp task that copies files to a destination folder. */
function copyFilesTask(fileList,destFolder) {
    return src(fileList,{allowEmpty: true})
        .pipe(dest(destFolder));
}

//=================================
// Package CSS
//=================================

const CSS_BUNDLE_FILENAME = "cssBundle.css";
const CSS_FILES_URLS = [
    "/apogeejs-view-lib/src/apogeeapp.css",
    "/apogeejs-appview-lib/src/componentdisplay/LiteratePage.css",
    "/apogeejs-webview-lib/src/componentdisplay/WebView.css",
    "/apogeejs-view-lib/src/componentdisplay/ComponentDisplay.css",
    "/apogeejs-appview-lib/src/editor/toolbar/ApogeeToolbar.css",
    "/apogeejs-ui-lib/src/window/dialog.css",
    "/apogeejs-ui-lib/src/displayandheader/DisplayAndHeader.css",
    "/apogeejs-ui-lib/src/menu/Menu.css",
    "/apogeejs-ui-lib/src/splitpane/SplitPane.css",
    "/apogeejs-ui-lib/src/tabframe/TabFrame.css",
    "/apogeejs-ui-lib/src/treecontrol/TreeControl.css",
    "/apogeejs-ui-lib/src/configurablepanel/ConfigurablePanel.css",
    "/apogeejs-ui-lib/src/configurablepanel/elements/listElement.css",
    "/apogeejs-ui-lib/src/tooltip/tooltip.css",  
    "/apogeejs-web-app/src/fileaccess/combinedFileAccess.css",
    "/prosemirror-admin/compiledCss/editor.css",    
    "/apogeejs-admin/ext/handsontable/handsontable_6.2.0/handsontable.full.min.css"
]

//convert for remapped directories
let cssFileSystemPaths = CSS_FILES_URLS.map(resolveAbsoluteUrl);

function packageCssTask() {
    return src(cssFileSystemPaths)
        .pipe(concat(CSS_BUNDLE_FILENAME))
        .pipe(dest(outputFolder))
}



//----------------
// resources (images, mainly)
//----------------

const RESOURCES_FOLDER_NAME = "resources";
const RESOURCE_URL_PATTERN = "/apogeejs-admin/resources/**/*";

//convert for remapped directories
let resourceSystemFilesPattern = resolveAbsoluteUrl(RESOURCE_URL_PATTERN);

function copyResourcesTask() {
    return src(resourceSystemFilesPattern)
        .pipe(dest(path.join(outputFolder,RESOURCES_FOLDER_NAME)))
}

//----------------
// ace includes (themes and things like that)
//----------------

const ACE_INCLUDES_FOLDER_NAME = "ace_includes";
const ACE_INCLUDE_URL_PATTERN = "/apogeejs-admin/ext/ace/ace_1.4.3/ace_includes/**/*";

//convert for remapped directories
let aceIncludeSystemFilesPattern = resolveAbsoluteUrl(ACE_INCLUDE_URL_PATTERN);

function copyAceIncludesTask() {
    return src(aceIncludeSystemFilesPattern)
        .pipe(dest(path.join(outputFolder,ACE_INCLUDES_FOLDER_NAME)))
}

//----------------
// globals definition files
//----------------

const GLOBAL_SRC_URLS = [
    "/apogeejs-model-lib/src/webGlobals.js",
    "/apogeejs-model-lib/src/debugHook.js"
]

//convert for remapped directories
let globalSrcFileSystemPaths = GLOBAL_SRC_URLS.map(resolveAbsoluteUrl);

let copyGlobalFiles = () => copyFilesTask(globalSrcFileSystemPaths,outputFolder)

//==============================
// Web App
//==============================

const WEB_PAGE_NAME = "apogee.html"
const WEB_APP_JS_FILENAME = "apogeeWebApp.js";

let releaseWebAppTask = parallel(
    copyWebAppPageTask,
    packageWebAppTask
)

function copyWebAppPageTask() {
    let baseHref = versionAssetsPath + "/";

    return src('../src/apogee.DEPLOY.html')
        .pipe(replace("BASE_HREF",baseHref))
        .pipe(replace("APOGEE_VERSION",version))
        .pipe(rename(WEB_PAGE_NAME))
        .pipe(dest(outputFolder));
}

function packageWebAppTask() {
    return rollup.rollup({
        input: '../src/app.js',
        plugins: [
            {resolveId}
        ]
    }).then(bundle => {
        return bundle.write(
            { 
                file: path.join(outputFolder,WEB_APP_JS_FILENAME),
                format: 'es',
                banner: getJsFileHeader(WEB_APP_JS_FILENAME,version)
            }
        );
    });
}

//============================
// Exports
//============================

//This task executes the complete release
exports.release = series(
    () => makeSureReleaseNotPresent(outputFolder),
    parallel(
        copyReleaseInfoTask,
        packageCssTask,
        copyResourcesTask,
        copyAceIncludesTask,
        copyGlobalFiles,
        releaseWebAppTask,
    )
);

