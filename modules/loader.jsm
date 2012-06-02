
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

const EXPORTED_SYMBOLS = ["YaripLoader"];

const Cu = Components.utils;

const yarip = Cu.import("resource://yarip/yarip.jsm", null).wrappedJSObject;
Cu.import("resource://yarip/constants.jsm");

function YaripLoader()
{
    this.hasWhitelist = false;
    this.hasBlacklist = false;
    this.hasStyles = false;
    this.hasScripts = false;
}
YaripLoader.prototype.load = function(doc, increment)
{
    if (!doc) return false;

    var pageName = yarip.getPageName(doc.location, MODE_PAGE);
    if (!pageName) return false;

    var addressObj = yarip.getAddressObj(pageName, true);
    if (!addressObj.found) return false;

    this.doWhitelisting(doc, addressObj, increment);
    this.doBlacklisting(doc, addressObj, increment);
    this.doStyling(doc, addressObj, increment);
    this.doScripting(doc, addressObj, increment);

    if (addressObj.elementExclusive || this.hasWhitelist && !this.hasBlacklist) {
        yarip.removeAllExceptWhitelisted(doc, pageName);
    }

    try {
        return this.hasWhitelist || this.hasBlacklist || this.hasStyles || this.hasScripts;
    } finally {
        this.reset();
    }
}
YaripLoader.prototype.reset = function()
{
    this.hasWhitelist = false;
    this.hasBlacklist = false;
    this.hasStyles = false;
    this.hasScripts = false;
}
YaripLoader.prototype.doWhitelisting = function(doc, addressObj, increment)
{
    for (var pageName in addressObj.ext)
    {
        var extItem = addressObj.ext[pageName];
        if (!extItem.getDoElements()) continue;

        var page = yarip.map.get(pageName);
        var list = page.elementWhitelist;
        if (list.length === 0) continue;

        var isSelf = extItem.isSelf();
        for each (var item in list.obj) {
            if (yarip.whitelistElementItem(doc, pageName, item, false, isSelf && increment)) {
                this.hasWhitelist = true;
            }
        }
    }
}
YaripLoader.prototype.doBlacklisting = function(doc, addressObj, increment)
{
    for (var pageName in addressObj.ext)
    {
        var extItem = addressObj.ext[pageName];
        if (!extItem.getDoElements()) continue;

        var page = yarip.map.get(pageName);
        var list = page.elementBlacklist;
        if (list.length == 0) continue;

        var isSelf = extItem.isSelf();
        for each (var item in list.obj) {
            if (yarip.blacklistElementItem(doc, pageName, item, false, isSelf && increment)) {
                this.hasBlacklist = true;
            }
        }
    }
}
YaripLoader.prototype.doStyling = function(doc, addressObj, increment)
{
    for (var pageName in addressObj.ext)
    {
        var extItem = addressObj.ext[pageName];
        if (!extItem.getDoElements()) continue;

        var page = yarip.map.get(pageName);
        var list = page.pageStyleList;
        if (list.length == 0) continue;

        var isSelf = extItem.isSelf();
        var idPrefix = "yarip-page-style_" + pageName.replace(/\W/g, "-") + "_";
        var counter = 0;

        // page styling
        for each (var item in list.obj)
        {
            var s = item.getStyle();
            if (!s) continue;

            var id = idPrefix + counter++;
            var style = doc.getElementById(id);
            if (style) continue;

            var elements = yarip.getElementsByXPath(doc, item.getXPath());
            if (elements && elements.snapshotLength > 0) {
                var element = elements.snapshotItem(0);
                this.injectCascadingStyleSheet(doc, id, s, element);
                if (increment && isSelf) {
                    item.incrementFound();
                }
            } else {
                if (increment && isSelf) {
                    item.incrementNotFound();
                }
            }
        }

        // element styling
        list = page.elementAttributeList;
        for each (var item in list.obj) {
            if (yarip.styleElementItem(doc, pageName, item, null, isSelf && increment)) {
                this.hasStyles = true;
            }
        }
    }
}
YaripLoader.prototype.doScripting = function(doc, addressObj, increment)
{
    var arr = [];
    for (var pageName in addressObj.ext) {
        var extItem = addressObj.ext[pageName];
        var isSelf = extItem.isSelf();
        if (isSelf || extItem.getDoScripts()) {
            arr.push({"pageName": pageName, "isSelf": isSelf});
        }
    }

    var obj = {};
    var found = false;

    // page scripting
    for (var i = arr.length - 1; i >= 0; i--)
    {
        var aObj = arr[i];
        var pageName = aObj.pageName;

        var page = yarip.map.get(pageName);
        var list = page.pageScriptList;
        if (list.length == 0) continue;

        var isSelf = aObj.isSelf;
        var idPrefix = "yarip-page-script_" + pageName.replace(/\W/g, "-") + "_";
        var counter = 0;

        for each (var o in list.obj)
        {
            var s = o.getScript();
            if (!s) continue;

            var id = idPrefix + counter++;
            var script = doc.getElementById(id);
            if (script) continue;

            var elements = yarip.getElementsByXPath(doc, o.getXPath());
            if (elements && elements.snapshotLength > 0) {
                var element = elements.snapshotItem(0);
                obj[id] = {
                    script: s,
                    element: element
                };
                if (increment && isSelf) {
                    o.incrementFound();
                }
                found = true;
            } else {
                if (increment && isSelf) {
                    o.incrementNotFound();
                }
            }
        }
    }

    // element scripting
    for (var i = arr.length - 1; i >= 0; i--)
    {
        var aObj = arr[i];
        var pageName = aObj.pageName;

        var page = yarip.map.get(pageName);
        var list = page.elementScriptList;
        if (list.length == 0) continue;

        var isSelf = aObj.isSelf;
        var idPrefix = "yarip-element-script_" + pageName.replace(/\W/g, "-") + "_";
        var counter = 0;

        for each (var o in list.obj)
        {
            var s = o.getScript();
            if (!s) continue;

            var id = idPrefix + counter++;
            var script = doc.getElementById(id);
            if (script) continue;

            // TODO How to evaluate the XPath only once!?
            if (increment && isSelf) {
                var elements = yarip.getElementsByXPath(doc, o.getXPath());
                if (elements && elements.snapshotLength > 0) {
                    o.incrementFound();
                } else {
                    o.incrementNotFound();
                    continue;
                }
            }

            var x = o.getXPath().replace(/(["])/g, "\\$1"); // TODO Anything else!?
            obj[id] = {
                script: "yarip.run(" + s + ",\"" + x + "\");\n",
                element: null // /html/body
            };
            found = true;
        }
    }

    if (found) {
        this.injectJavaScript(doc, "yarip-default-script", yarip.getYaripScript());
        for (var id in obj) {
            this.injectJavaScript(doc, id, obj[id].script, obj[id].element);
        }
    }
}
YaripLoader.prototype.injectCascadingStyleSheet = function(doc, id, css, parent)
{
    var element = doc.getElementById(id);
    if (element) {
        if (element.getAttribute("status") != "whitelisted") {
            element.parentNode.removeChild(element);
        } else {
            return;
        }
    }
    var style = doc.createElement("style");
    style.type = "text/css";
    style.setAttribute("id", id);
    style.setAttribute("status", "whitelisted");
    style.innerHTML = css;
    if (parent) {
        parent.appendChild(style);
    } else {
        doc.getElementsByTagName("head")[0].appendChild(style);
    }
    this.hasStyles = true;
}
YaripLoader.prototype.injectJavaScript = function(doc, id, js, parent)
{
    var element = doc.getElementById(id);
    if (element) {
        if (element.getAttribute("status") != "whitelisted") {
            element.parentNode.removeChild(element);
        } else {
            return;
        }
    }
    var script = doc.createElement("script");
    script.type = "text/javascript";
    script.setAttribute("id", id);
    script.setAttribute("status", "whitelisted");
    script.innerHTML = js;
    if (parent) {
        parent.appendChild(script);
    } else {
        doc.getElementsByTagName("body")[0].appendChild(script);
    }
    this.hasScripts = true;
}

