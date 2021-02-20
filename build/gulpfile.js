const { src, dest, series, parallel} = require('gulp');
//const concat = require('gulp-concat');
const rollup = require('rollup');
const replace = require('gulp-replace');
const rename = require('gulp-rename');
const path = require('path');
const buildUtils = require("../../apogeejs-admin/src/build-utils.js");

const versionConfig = require('../versionConfig.json');

//read data from the release package.json
let isProductionRelease = versionConfig.isProductionRelease;
let version = versionConfig.version;
let appBundleVersion = versionConfig.version;
let webPageHrefPath = versionConfig.hrefPath;
let pathMapping = versionConfig.pathMapping;

let repoName = "apogeejs-web-app";

//for absolute references
const PATH_TO_ABSOLUTE_ROOT = "../..";
let resolveAbsoluteUrl = buildUtils.createResolveAbsoluteUrl(__dirname,PATH_TO_ABSOLUTE_ROOT,pathMapping); //used to convert urls to paths
let resolveId = buildUtils.createResolveId(resolveAbsoluteUrl); //used for rollup

const outputFolder = resolveAbsoluteUrl(buildUtils.getEsReleaseFolderUrl(repoName,version,isProductionRelease));

//======================================
// Release Info
//======================================

//base files - version info
const FILES_TO_COPY_URLS = [
    "/apogeejs-web-app/versionConfig.json",
    "/apogeejs-web-app/src/fileaccess/combinedFileAccess.css"
]

let filesToCopySystemPaths = FILES_TO_COPY_URLS.map(resolveAbsoluteUrl);

let copyFilesTask = parallel(
    () => copyFiles(filesToCopySystemPaths,outputFolder)
)

//==============================
// Web App
//==============================

const SRC_WEB_PAGE_FILE = '../src/apogee.DEPLOY.html'
const WEB_PAGE_NAME = "apogee.html"
const APP_CONFIG_SRC = "../src/fileaccess/CombinedFileAccessAppConfigManager.js";
const APP_CONFIG_RELEASE_NAME = "CombinedFileAccessAppConfigManager.js";

function copyWebAppPageTask() {
    //fix path - related to odd problem on windows with rollup "dest"
    let srcFile = buildUtils.fixPath(SRC_WEB_PAGE_FILE);
    let target = buildUtils.fixPath(outputFolder);

    return src(srcFile)
        .pipe(replace("[BASE_HREF]",webPageHrefPath))
        .pipe(replace("[RELEASE_VERSION]",version))
        .pipe(replace("[APOGEE_BUNDLE_VERSION]",appBundleVersion))
        .pipe(rename(WEB_PAGE_NAME))
        .pipe(dest(target));
}

function packageAppConfigTask() {
    return rollup.rollup({
        input: APP_CONFIG_SRC,
        plugins: [
            {resolveId}
        ]
    }).then(bundle => {
        return bundle.write(
            { 
                file: path.join(outputFolder,APP_CONFIG_RELEASE_NAME),
                format: 'es',
                banner: buildUtils.getJsFileHeader(APP_CONFIG_RELEASE_NAME,version)
            }
        );
    });
}

//=============================
// internal functions
//=============================

/** This function is a gulp task that copies files to a destination folder. */
function copyFiles(fileList,destFolder) {
    //I had some occasional problems on windows without this step
    //I think this is related to an issue cited in the rollup "dest" documentation, but
    //I didn't understard how to otherwise fix it.
    let alteredDestFolder = buildUtils.fixPath(destFolder);
    let alteredFileList = fileList.map(buildUtils.fixPath);

    return src(alteredFileList,{allowEmpty: true})
        .pipe(dest(alteredDestFolder));
}

//============================
// Exports
//============================

//This task executes the complete release
exports.release = series(
    () => buildUtils.makeSureReleaseNotPresent(outputFolder),
    parallel(
        copyFilesTask,
        copyWebAppPageTask,
        packageAppConfigTask
    )
);

