
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

const EXPORTED_SYMBOLS = ["YaripPage"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://yarip/constants.jsm");
Cu.import("resource://yarip/uri.jsm");
Cu.import("resource://yarip/object.jsm");
Cu.import("resource://yarip/list.jsm");
Cu.import("resource://yarip/item.jsm");

function YaripPage(id, name, elementWhitelist, elementBlacklist, elementAttributeList, elementScriptList, contentWhitelist, contentBlacklist, contentRequestHeaderList, contentResponseHeaderList, contentRedirectList, contentStreamList, pageStyleList, pageScriptList, pageRequestHeaderList, pageResponseHeaderList, pageRedirectList, pageStreamList, pageExtensionList, pageExtendedByList)
{
    this.id = null;
    this.name = "";
    this.type = PAGE_TYPE_UNKNOWN;
    this.elementWhitelist = elementWhitelist ? elementWhitelist : new YaripElementWhitelist("whitelist");
    this.elementBlacklist = elementBlacklist ? elementBlacklist : new YaripElementBlacklist("blacklist");
    this.elementAttributeList = elementAttributeList ? elementAttributeList : new YaripElementAttributeList("attribute");
    this.elementScriptList = elementScriptList ? elementScriptList : new YaripElementScriptList("script");
    this.contentWhitelist = contentWhitelist ? contentWhitelist : new YaripContentWhitelist("whitelist");
    this.contentBlacklist = contentBlacklist ? contentBlacklist : new YaripContentBlacklist("blacklist");
    this.contentRequestHeaderList = contentRequestHeaderList ? contentRequestHeaderList : new YaripHeaderList("request");
    this.contentResponseHeaderList = contentResponseHeaderList ? contentResponseHeaderList : new YaripHeaderList("response");
    this.contentRedirectList = contentRedirectList ? contentRedirectList : new YaripRedirectList("redirect");
    this.contentStreamList = contentStreamList ? contentStreamList : new YaripStreamReplaceList("stream");
    this.pageStyleList = pageStyleList ? pageStyleList : new YaripPageStyleList("style");
    this.pageScriptList = pageScriptList ? pageScriptList : new YaripPageScriptList("script");
    this.pageRequestHeaderList = pageRequestHeaderList ? pageRequestHeaderList : new YaripHeaderList("request");
    this.pageResponseHeaderList = pageResponseHeaderList ? pageResponseHeaderList : new YaripHeaderList("response");
    this.pageRedirectList = pageRedirectList ? pageRedirectList : new YaripRedirectList("redirect");
    this.pageStreamList = pageStreamList ? pageStreamList : new YaripStreamReplaceList("stream");
    this.pageExtensionList = pageExtensionList ? pageExtensionList : new YaripPageExtensionList("extension");
    this.pageExtendedByList = pageExtendedByList ? pageExtendedByList : new YaripPageExtendedByList();
    this.temporary = false;

    this.setId(id);
    this.setName(name, true);
}
YaripPage.prototype = new YaripObject;
YaripPage.prototype.constructor = YaripPage;
YaripPage.prototype.getKey = function()
{
    return this.getId();
}
YaripPage.prototype.setId = function(value)
{
    if (!value) return;

    this.id = "" + value;
    this.pageExtensionList.setId(this.id);
    this.pageExtendedByList.setId(this.id);
}
YaripPage.prototype.getId = function()
{
    return this.id;
}
YaripPage.prototype.setName = function(value, init)
{
    if (value) {
        this.name = "" + value;
        if (init) this.init();
    }
}
YaripPage.prototype.getName = function()
{
    return this.name;
}
YaripPage.prototype.setType = function(value)
{
    this.type = value;
}
YaripPage.prototype.getType = function()
{
    return this.type;
}
YaripPage.prototype.isEmpty = function()
{
    return this.elementWhitelist.isEmpty()
        && this.elementBlacklist.isEmpty()
        && this.elementAttributeList.isEmpty()
        && this.elementScriptList.isEmpty()
        && this.contentWhitelist.isEmpty()
        && this.contentBlacklist.isEmpty()
        && this.contentRequestHeaderList.isEmpty()
        && this.contentResponseHeaderList.isEmpty()
        && this.contentRedirectList.isEmpty()
        && this.contentStreamList.isEmpty()
        && this.pageStyleList.isEmpty()
        && this.pageScriptList.isEmpty()
        && this.pageRequestHeaderList.isEmpty()
        && this.pageResponseHeaderList.isEmpty()
        && this.pageRedirectList.isEmpty()
        && this.pageStreamList.isEmpty()
        && this.pageExtensionList.isEmpty()
        && this.pageExtendedByList.isEmpty();
}
YaripPage.prototype.hasElements = function()
{
    return !this.elementWhitelist.isEmpty()
        || !this.elementBlacklist.isEmpty()
        || !this.elementAttributeList.isEmpty()
        || !this.pageStyleList.isEmpty();
}
YaripPage.prototype.hasContents = function()
{
    return !this.contentWhitelist.isEmpty()
        || !this.contentBlacklist.isEmpty();
}
YaripPage.prototype.hasScripts = function()
{
    return !this.elementScriptList.isEmpty()
        || !this.pageScriptList.isEmpty();
}
YaripPage.prototype.hasHeaders = function()
{
    return !this.contentRequestHeaderList.isEmpty()
        || !this.contentResponseHeaderList.isEmpty()
        || !this.pageRequestHeaderList.isEmpty()
        || !this.pageResponseHeaderList.isEmpty();
}
YaripPage.prototype.hasRedirects = function()
{
    return !this.contentRedirectList.isEmpty()
        || !this.pageRedirectList.isEmpty();
}
YaripPage.prototype.hasStreams = function()
{
    return !this.contentStreamList.isEmpty()
        || !this.pageStreamList.isEmpty();
}
YaripPage.prototype.setTemporary = function(value)
{
    this.temporary = "" + value == "true";
}
YaripPage.prototype.getTemporary = function()
{
    return this.temporary;
}
//YaripPage.prototype.clone = function(purge, pageName)
YaripPage.prototype.clone = function(purge, pageName, id)
{
    var origId = this.id;
    if (purge || id) {
        this.id = id ? id : this.newId();
        this.pageExtensionList.id = this.id;
        this.pageExtendedByList.id = this.id;
    }
    var tmp = new this.constructor(
            this.id,
            pageName ? pageName : this.name,
            this.elementWhitelist.clone(purge),
            this.elementBlacklist.clone(purge),
            this.elementAttributeList.clone(purge),
            this.elementScriptList.clone(purge),
            this.contentWhitelist.clone(purge),
            this.contentBlacklist.clone(purge),
            this.contentRequestHeaderList.clone(purge),
            this.contentResponseHeaderList.clone(purge),
            this.contentRedirectList.clone(purge),
            this.contentStreamList.clone(purge),
            this.pageStyleList.clone(),
            this.pageScriptList.clone(),
            this.pageRequestHeaderList.clone(purge),
            this.pageResponseHeaderList.clone(purge),
            this.pageRedirectList.clone(purge),
            this.pageStreamList.clone(purge),
            this.pageExtensionList.clone(purge),
            purge ? null : this.pageExtendedByList.clone());
    if (purge || id) {
        this.id = origId;
        this.pageExtensionList.id = this.id;
        this.pageExtendedByList.id = this.id;
    }
    return tmp;
}
YaripPage.prototype.merge = function(page)
{
    if (!page) return;
    this.elementWhitelist.merge(page.elementWhitelist);
    this.elementBlacklist.merge(page.elementBlacklist);
    this.elementAttributeList.merge(page.elementAttributeList);
    this.elementScriptList.merge(page.elementScriptList);
    this.contentWhitelist.merge(page.contentWhitelist);
    this.contentBlacklist.merge(page.contentBlacklist);
    this.contentRequestHeaderList.merge(page.contentRequestHeaderList);
    this.contentResponseHeaderList.merge(page.contentResponseHeaderList);
    this.contentRedirectList.merge(page.contentRedirectList);
    this.contentStreamList.merge(page.contentStreamList);
    this.pageStyleList.merge(page.pageStyleList);
    this.pageScriptList.merge(page.pageScriptList);
    this.pageRequestHeaderList.merge(page.pageRequestHeaderList);
    this.pageResponseHeaderList.merge(page.pageResponseHeaderList);
    this.pageRedirectList.merge(page.pageRedirectList);
    this.pageStreamList.merge(page.pageStreamList);
    this.pageExtensionList.merge(page.pageExtensionList);
//    this.pageExtensionList.removeByKey(this.getId());
    this.pageExtendedByList.merge(page.pageExtendedByList);
//    this.pageExtendedByList.removeByKey(this.getId());
//    this.setTemporary(this.getTemporary() || page.getTemporary());
    this.setTemporary(this.getTemporary() && page.getTemporary());
}
//YaripPage.prototype.subtract = function(page)
//{
//    if (!page) return;
//    this.elementWhitelist.subtract(page.elementWhitelist);
//    this.elementBlacklist.subtract(page.elementBlacklist);
//    this.elementAttributeList.subtract(page.elementAttributeList);
//    this.elementScriptList.subtract(page.elementScriptList);
//    this.contentWhitelist.subtract(page.contentWhitelist);
//    this.contentBlacklist.subtract(page.contentBlacklist);
//    this.contentRequestHeaderList.subtract(page.contentRequestHeaderList);
//    this.contentResponseHeaderList.subtract(page.contentResponseHeaderList);
//    this.contentRedirectList.subtract(page.contentRedirectList);
//    this.contentStreamList.subtract(page.contentStreamList);
//    this.pageStyleList.subtract(page.pageStyleList);
//    this.pageScriptList.subtract(page.pageScriptList);
//    this.pageRequestHeaderList.subtract(page.pageRequestHeaderList);
//    this.pageResponseHeaderList.subtract(page.pageResponseHeaderList);
//    this.pageRedirectList.subtract(page.pageRedirectList);
//    this.pageStreamList.subtract(page.pageStreamList);
//    this.pageExtensionList.subtract(page.pageExtensionList);
//    this.setTemporary(false);
//}
YaripPage.prototype.purge = function()
{
    this.elementWhitelist.purge();
    this.elementBlacklist.purge();
    this.elementAttributeList.purge();
    this.elementScriptList.purge();
    this.contentWhitelist.purge();
    this.contentBlacklist.purge();
    this.contentRequestHeaderList.purge();
    this.contentResponseHeaderList.purge();
    this.contentRedirectList.purge();
    this.contentStreamList.purge();
    this.pageStyleList.purge();
    this.pageScriptList.purge();
    this.pageRequestHeaderList.purge();
    this.pageResponseHeaderList.purge();
    this.pageRedirectList.purge();
    this.pageStreamList.purge();
    this.setTemporary(false);
}
//YaripPage.prototype.destroy = function()
//{
//    var list = this.pageExtensionList;
//    for each (var o in list.obj) {
//        var page = o.getPage();
//        if (page) page.pageExtendedByList.removeByKey(this.getId());
//    }
//    list = this.pageExtendedByList;
//    for each (var o in list.obj) {
//        var page = o.getPage();
//        if (page) page.pageExtensionList.removeByKey(this.getId());
//    }
//}

YaripPage.prototype.init = function()
{
//    if (!this.getName()) return;

    var matches = this.getName().match(URI_SIMPLE_RE);
//if (/\b(example|localhost|yarip)\b/.test(this.getName())) {
//    for (var i = 0; i < matches.length; i++) {
//        if (matches[i]) dump("matches["+i+"]="+matches[i]+"\n");
//    }
//}
    if (matches) {
        var scheme = matches[URI1_SCHEME_INDEX] || "";
        var ip = matches[URI1_IP_INDEX] || matches[URI2_IP_INDEX] || "";
        var domain = matches[URI1_REG_NAME_TLD_INDEX] || matches[URI2_REG_NAME_INDEX] || "";
        var simple = matches[SIMPLE_DOT_INDEX];
        var tld = matches[URI2_TLD_INDEX];
        if (domain) {
            if (tld) { // uri2
                this.setType(PAGE_TYPE_DOMAIN);
                this.obj = {
                    scheme: scheme,
                    domainArr: (domain + tld).split('.').reverse(),
                    tldArr: tld.split('.').reverse()
                };
            } else { // uri1
//                this.setType(PAGE_TYPE_DOMAIN);
//                tld = domain.match(FIND_TLD_RE);
//                this.obj = {
//                    scheme: scheme,
//                    domainArr: domain.split('.').reverse(),
//                    tldArr: tld ? tld[0].split('.').reverse() : null
//                };
                tld = domain.match(FIND_TLD_RE);
                if (tld) {
                    this.setType(PAGE_TYPE_DOMAIN);
                    this.obj = {
                        scheme: scheme,
                        domainArr: domain.split('.').reverse(),
                        tldArr: tld ? tld[0].split('.').reverse() : null
                    };
                } else {
                    this.setType(PAGE_TYPE_SIMPLE);
                    this.obj = {
                        scheme: scheme,
                        domainArr: domain.split('.').reverse(),
                    };
                }
            }
        } else if (ip) {
            this.setType(PAGE_TYPE_IP);
            this.obj = {
                scheme: scheme,
                ipArr: ip.split('.')
            };
        } else if (simple) {
            this.setType(PAGE_TYPE_SIMPLE);
            this.obj = {
                scheme: scheme,
                domainArr: simple.split('.').reverse()
            };
        }
    }
//if (/\b(example|localhost|yarip)\b/.test(this.getName())) {
//    dump("\n"+this.getName()+"\n");
//    dump(" type => "+this.getType()+"\n");
//    dump(" obj => "+JSON.stringify(this.obj)+"\n");
//}
}
YaripPage.prototype.compare = function(b, rec)
{
    if (!b) return 1;
//if (!rec && (/\b(example|localhost|yarip)\b/.test(this.getName()) || /\b(example|localhost|yarip)\b/.test(b.getName()))) {
//    dump(this.getName()+".compare("+b.getName()+") => "+this.compare(b, true)+"\n");
//}
    // Comparing types
    var aType = this.getType();
    var bType = b.getType();
    if (aType < bType) return -1;
    if (aType > bType) return 1;

    // Same types
    switch (aType) {
    case PAGE_TYPE_IP:
        // Comparing IPs
        var aIpArr = this.obj.ipArr;
        var bIpArr = b.obj.ipArr;
        if (aIpArr < bIpArr) return -1;
        if (aIpArr > bIpArr) return 1;
        break;

    case PAGE_TYPE_SIMPLE:
        // Comparing DOMAINs (SIMPLE)
        var aDomainArr = this.obj.domainArr;
        var bDomainArr = b.obj.domainArr;
        if (aDomainArr < bDomainArr) return -1;
        if (aDomainArr > bDomainArr) return 1;
        break;

    case PAGE_TYPE_DOMAIN:
        // Comparing TLDs
        var aTldArr = this.obj.tldArr;
        var bTldArr = b.obj.tldArr;
        if (aTldArr < bTldArr) return -1;
        if (aTldArr > bTldArr) return 1;
        // Comparing DOMAINs
        var aDomainArr = this.obj.domainArr;
        var bDomainArr = b.obj.domainArr;
        if (aDomainArr < bDomainArr) return -1;
        if (aDomainArr > bDomainArr) return 1;
//        // Comparing SCHEMEs
//        var aScheme = this.obj.scheme;
//        var bScheme = b.obj.scheme;
//        if (aScheme < bScheme) return -1;
//        if (aScheme > bScheme) return 1;
        break;
    }

    // Comparing SCHEMEs
    var aScheme = this.obj.scheme;
    var bScheme = b.obj.scheme;
    if (aScheme < bScheme) return -1;
    if (aScheme > bScheme) return 1;

    var aName = this.getName();
    var bName = b.getName();
    if (aName < bName) return -1;
    if (aName > bName) return 1;
    return 0;
}
YaripPage.prototype.generateXml = function()
{
    if (this.temporary) return "";

    var tmpElement = this.elementWhitelist.generateXml() +
        this.elementBlacklist.generateXml() +
        this.elementAttributeList.generateXml() +
        this.elementScriptList.generateXml();
    if (tmpElement != "") {
        tmpElement = "\t\t<element>\n" + tmpElement + "\t\t</element>\n";
    }

    var tmpContentHeader = this.contentRequestHeaderList.generateXml() +
        this.contentResponseHeaderList.generateXml();
    var tmpContent = this.contentWhitelist.generateXml() +
        this.contentBlacklist.generateXml() +
        (tmpContentHeader != "" ? "\t\t\t<header>\n" + tmpContentHeader + "\t\t\t</header>\n" : "") +
        this.contentRedirectList.generateXml() +
        this.contentStreamList.generateXml();
    if (tmpContent != "") {
        tmpContent = "\t\t<content>\n" + tmpContent + "\t\t</content>\n";
    }

    var tmpPageHeader = this.pageRequestHeaderList.generateXml() +
        this.pageResponseHeaderList.generateXml();
    var tmpPage = this.pageStyleList.generateXml() +
        this.pageScriptList.generateXml() +
        (tmpPageHeader != "" ? "\t\t\t<header>\n" + tmpPageHeader + "\t\t\t</header>\n" : "") +
        this.pageRedirectList.generateXml() +
        this.pageStreamList.generateXml() +
        this.pageExtensionList.generateXml();
    if (tmpPage != "") {
        tmpPage = "\t\t<page>\n" + tmpPage + "\t\t</page>\n";
    }

    var tmp = tmpElement + tmpContent + tmpPage;
    return tmp != "" ? "\t<page id=\"" + this.id + "\" name=\"" + this.name + "\">\n" + tmp + "\t</page>\n" : "";
}
//YaripPage.prototype.generateCSS = function()
//{
//    if (this.temporary) return "";

//    if (DOMAIN_RE.test(this.name)) {
//        var tmp = this.elementBlacklist.generateCSS() +
//            this.pageStyleList.generateCSS();
//        if (tmp != "") {
//            return "@-moz-document domain(\"" + this.name + "\")\n{\n" + tmp.replace(/\n$/, "") + "}\n\n";
//        }
//    } else if (URL_RE.test(this.name)) {
//        var res = "";
//        tmp = this.elementBlacklist.generateCSS() +
//            this.pageStyleList.generateCSS();
//        if (tmp != "") res += "@-moz-document url-prefix(\"" + this.name + "\")\n{\n" + tmp.replace(/\n$/, "") + "}\n\n";
//        if (res != "") return res;
//    } else if (this.getType() === PAGE_TYPE_IP) {
//        var res = "";
//        tmp = this.elementBlacklist.generateCSS() +
//            this.pageStyleList.generateCSS();
//        if (tmp != "") res += "@-moz-document regexp(\"^https?://" + this.name.replace(/([.*+?|()\[\]{}\\])/g, "\\\\$1") + "([/?#].*)?\")\n{\n" + tmp.replace(/\n$/, "") + "}\n\n";
//        if (res != "") return res;
//    } else {
//        var res = "";
//        tmp = this.elementBlacklist.generateCSS() +
//            this.pageStyleList.generateCSS();
//        if (tmp != "") res += "@-moz-document regexp(\"^https?://([^/?#]+\\\\.)?" + this.name.replace(/([.*+?|()\[\]{}\\])/g, "\\\\$1") + "([/?#].*)?\")\n{\n" + tmp.replace(/\n$/, "") + "}\n\n";
//        if (res != "") return res;
//    }

//    return "";
//}
YaripPage.prototype.loadFromObject = function(obj)
{
    this.id = obj.id;
    this.name = obj.name;
    this.elementWhitelist.loadFromObject(obj.elementWhitelist);
    this.elementBlacklist.loadFromObject(obj.elementBlacklist);
    this.elementAttributeList.loadFromObject(obj.elementAttributeList);
    this.elementScriptList.loadFromObject(obj.elementScriptList);
    this.contentWhitelist.loadFromObject(obj.contentWhitelist);
    this.contentBlacklist.loadFromObject(obj.contentBlacklist);
    this.contentRequestHeaderList.loadFromObject(obj.contentRequestHeaderList);
    this.contentResponseHeaderList.loadFromObject(obj.contentResponseHeaderList);
    this.contentRedirectList.loadFromObject(obj.contentRedirectList);
    this.contentStreamList.loadFromObject(obj.contentStreamList);
    this.pageStyleList.loadFromObject(obj.pageStyleList);
    this.pageScriptList.loadFromObject(obj.pageScriptList);
    this.pageRequestHeaderList.loadFromObject(obj.pageRequestHeaderList);
    this.pageResponseHeaderList.loadFromObject(obj.pageResponseHeaderList);
    this.pageRedirectList.loadFromObject(obj.pageRedirectList);
    this.pageStreamList.loadFromObject(obj.pageStreamList);
    this.pageExtensionList.loadFromObject(obj.pageExtensionList);
    this.pageExtendedByList.loadFromObject(obj.pageExtendedByList);
}
YaripPage.prototype.createPageExtensionItem = function()
{
    var doElements = false;
    var doContents = false;
    var doScripts = false;
    var doHeaders = false;
    var doRedirects = false;
    var doStreams = false;
    var doLinks = false;
    var list = this.pageExtensionList.obj;
    for each (var item in list) {
        doElements = doElements || item.getDoElements();
        doContents = doContents || item.getDoContents();
        doScripts = doScripts || item.getDoScripts();
        doHeaders = doHeaders || item.getDoHeaders();
        doRedirects = doRedirects || item.getDoRedirects();
        doStreams = doStreams || item.getDoStreams();
        doLinks = doLinks || item.getDoLinks();
    }
    doElements = doElements || this.hasElements();
    doContents = doContents || this.hasContents();
    doScripts = doScripts || this.hasScripts();
    doHeaders = doHeaders || this.hasHeaders();
    doRedirects = doRedirects || this.hasRedirects();
    doStreams = doStreams || this.hasStreams();
    return new YaripExtensionItem(this.getId(), null /* priority */, doElements, doContents, doScripts, doHeaders, doRedirects, doStreams, doLinks);
}

