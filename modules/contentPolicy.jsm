
/*
Copyright 2007-2012 Kim A. Brandt <kimabrandt@gmx.de>

This file is part of yarip.

Yarip is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

Yarip is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with yarip; if not, write to the Free Software
Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/

const EXPORTED_SYMBOLS = ["YaripContentPolicy"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
const yarip = Cu.import("resource://yarip/yarip.jsm", null).wrappedJSObject;
Cu.import("resource://yarip/constants.jsm");

function YaripContentPolicy() {
}
YaripContentPolicy.prototype.classDescription = "Yet Another Remove It Permanently - Content Policy";
YaripContentPolicy.prototype.classID = Components.ID("{d5c0ebbd-cc48-46f7-b2db-e80aee358b7b}");
YaripContentPolicy.prototype.contractID = "@yarip.mozdev.org/content-policy;1";
YaripContentPolicy.prototype._xpcom_categories = [{ category: "content-policy" }];
YaripContentPolicy.prototype.QueryInterface = XPCOMUtils.generateQI([
        Ci.nsISupports,
        Ci.nsIContentPolicy,
        Ci.nsISupportsWeakReference
    ]);
YaripContentPolicy.prototype.shouldLoad = function(contentType, contentLocation, requestOrigin, context, mimeTypeGuess, extra)
{
    if (!yarip.schemesRegExp) return ACCEPT;
    if (!context || !contentLocation || !requestOrigin) return ACCEPT;
    if (!yarip.schemesRegExp.test(contentLocation.scheme)) return ACCEPT;
    if (!yarip.schemesRegExp.test(requestOrigin.scheme)) return ACCEPT;

    // Getting the document.location.
    if (context.nodeType != DOCUMENT_NODE) context = context.ownerDocument;
    var defaultView = context && context.nodeType == DOCUMENT_NODE ? context.defaultView : null;
    var doc = defaultView ? defaultView.document : null;
    var location = doc ? doc.location : null;
//    if (!location && requestOrigin) location = yarip.getLocationFromContentLocation(requestOrigin);
    if (!location || !yarip.schemesRegExp.test(location.protocol.replace(/:$/, ""))) return ACCEPT;

    // Getting the location.
    location = yarip.getLocationFromLocation(location);
    contentLocation = yarip.getContentLocationFromContentLocation(contentLocation);

    // Checking if yarip is enabled.
    if (!yarip.enabled) {
        yarip.logContentLocation(STATUS_UNKNOWN, location, contentLocation, mimeTypeGuess);
        return ACCEPT;
    }

    // Getting the address-obj and checking if we found some rules.
    var addressObj = yarip.getAddressObjByLocation(location, true);
    if (!addressObj.found) {
        yarip.logContentLocation(STATUS_UNKNOWN, location, contentLocation, mimeTypeGuess);
        return ACCEPT;
    }

    // DEBUG Dump the profiling data.
//    if (Date.now() - yarip.profileTime > 5000) {
//        dump("key,count,totalTime,avgTime\n");
//        for (var key in yarip.profileObj) {
//            var p = yarip.profileObj[key];
//            var avgTime = p.totalTime / p.count;
//            if (p.count > 10 && avgTime > 0.5) {
//                dump(key + "," + p.count + "," + p.totalTime + "," + (Math.round(avgTime * 1000) / 1000) + "\n");
//            }
//        }
//        dump("---\n");
//        yarip.profileTime = Date.now();
//    }

    var status = yarip.shouldBlacklist(addressObj, contentLocation.asciiSpec, defaultView);
    yarip.logContentLocation(status, location, contentLocation, mimeTypeGuess, addressObj);
    switch (status) {
    case STATUS_UNKNOWN:
        return ACCEPT;
    case STATUS_WHITELISTED:
        return ACCEPT;
    case STATUS_BLACKLISTED:
        return REJECT_SERVER;
    }
}
YaripContentPolicy.prototype.shouldProcess = function(contentType, contentLocation, requestOrigin, context, mimeType, extra)
{
    return ACCEPT;
}
YaripContentPolicy.prototype.createInstance = function()
{
    return this;
}

var wrappedJSObject = new YaripContentPolicy();

