
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

const EXPORTED_SYMBOLS = [
        "YaripList",
        "YaripElementWhitelist",
        "YaripElementBlacklist",
        "YaripElementAttributeList",
        "YaripElementScriptList",
        "YaripContentWhitelist",
        "YaripContentBlacklist",
        "YaripStreamReplaceList",
        "YaripPageStyleList",
        "YaripPageScriptList",
        "YaripHeaderList",
        "YaripRedirectList",
        "YaripPageExtensionList",
        "YaripPageExtendedByList"
    ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://yarip/constants.jsm");
Cu.import("resource://yarip/object.jsm");
Cu.import("resource://yarip/item.jsm");

function YaripList(name, exclusive)
{
    this.name = "";
    this.obj = {};
    this.objId = {};
    this.listLength = 0;
    this.exclusive = false;
    this.sorted = true;

    this.setName(name);
    this.setExclusive(exclusive);
}
YaripList.prototype = new YaripObject;
YaripList.prototype.constructor = YaripList;
YaripList.prototype.setName = function(value)
{
    if (value) this.name = "" + value;
}
YaripList.prototype.getName = function()
{
    return this.name;
}
YaripList.prototype.setExclusive = function(value)
{
    this.exclusive = "" + value == "true";
}
YaripList.prototype.getExclusive = function()
{
//    return this.listLength > 0 && this.exclusive;
    return !this.isEmpty() && this.exclusive;
}
YaripList.prototype.isEmpty = function()
{
    for (var k in this.obj) { return false; }
    return true;
}
YaripList.prototype.__defineGetter__("length", function() {
        return this.listLength;
    });
YaripList.prototype.getByKey = function(key)
{
    return key in this.obj ? this.obj[key] : null;
}
YaripList.prototype.getById = function(id)
{
    return id in this.objId ? this.objId[id] : null;
}
YaripList.prototype.add = function(item, purge)
{
    if (!item) return false;

    var existItem = this.objId[item.getId()];
    if (existItem) {
        existItem.merge(item);
        if (purge) existItem.purge();
    } else {
        if (purge) item.purge();
        this.obj[item.getKey()] = item;
        this.objId[item.getId()] = item;
        this.sorted = false;
        this.listLength++;
    }

    return true;
}
YaripList.prototype.remove = function(item)
{
    if (!item) return;

    this.removeById(item.getId());
}
YaripList.prototype.removeById = function(id)
{
    if (!id || !(id in this.objId)) return;

    var item = this.objId[id];
    delete this.obj[item.getKey()];
    delete this.objId[id];
    this.listLength--;
}
YaripList.prototype.removeByKey = function(key)
{
    if (!key || !(key in this.obj)) return;

    this.remove(this.obj[key]);
}
YaripList.prototype.contains = function(item)
{
    return item.getKey() in this.obj;
//    return item.getId() in this.objId;
}
YaripList.prototype.reset = function()
{
    this.obj = {};
    this.objId = {};
    this.listLength = 0;
    this.sorted = true;
}
YaripList.prototype.sort = function(purge)
{
    if (this.sorted) return;
    var a = [];
    for each (var item in this.obj) a.push(item);
    a.sort(function(a, b) { return a.compare(b); });
    this.reset();
    for (var i = 0; i < a.length; i++) this.add(a[i], purge);
    this.sorted = true;
}
YaripList.prototype.purge = function()
{
    for each (var item in this.obj) if (item) item.purge();
}
YaripList.prototype.clone = function(purge)
{
    var tmp = new this.constructor(this.name, this.exclusive);
    for each (var item in this.obj) if (item) tmp.add(item.clone(purge));
    return tmp;
}
YaripList.prototype.merge = function(list)
{
    this.setExclusive(this.getExclusive() || list.getExclusive());
    for each (var item in list.obj) this.add(item.clone());
}
YaripList.prototype.generateXml = function()
{
    var tmp = "";
    for each (var item in this.obj) if (item) tmp += item.generateXml();
    if (tmp != "") {
        return "\t\t\t" +
            "<" + this.name + (this.exclusive ? " exclusive=\"" + this.exclusive + "\"" : "") + ">\n" +
            tmp +
            "\t\t\t</" + this.name + ">\n";
    } else {
        return "";
    }
}
YaripList.prototype.generateCSS = function()
{
    var tmp = "";
    for each (var item in this.obj) if (item) tmp += item.generateCSS();
    if (tmp != "") {
        return tmp.replace(/,\n$/, "") + " {\n\tdisplay: none !important;\n}";
    } else {
        return "";
    }
}

function YaripElementWhitelist(name, exclusive)
{
    this.name = "whitelist";
    this.obj = {};
    this.objId = {};
    this.listLength = 0;
    this.exclusive = false;
    this.sorted = true;

    this.setName(name);
    this.setExclusive(exclusive);
}
YaripElementWhitelist.prototype = new YaripList;
YaripElementWhitelist.prototype.constructor = YaripElementWhitelist;
YaripElementWhitelist.prototype.set = function(row, col, value)
{
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case 0:
            if (!this.checkXPath(value)) return false;

            var c = item.clone();
            c.setXPath(value);
            if (this.contains(c)) return false;

            FH.removeEntry("xpath", item.getXPath());
            this.remove(item);

            this.add(c);
            FH.addEntry("xpath", value);
            return c.getKey();
        case 1:
            var c = item.clone();
            c.setPriority(value);
            if (!this.contains(c)) {
                this.remove(item);
                this.add(c);
                return c.getKey();
            } else {
                return false;
            }
        case 2:
            item.setForce(value);
            return false;
        default:
            return false;
        }
    }
    return false;
}
YaripElementWhitelist.prototype.get = function(row, col)
{
    if (!this.sorted) this.sort();
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case LIST_INDEX_KEY: return item.getKey();
        case 0: return item.getXPath();
        case 1: return item.getPriority();
        case 2: return item.getForce();
        case 3:
            var ms = item.getCreated();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        case 4:
            var ms = item.getLastFound();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        case 5: return item.getFound();
        case 6: return item.getNotFound();
        case 7: return item.getIgnored();
        default: return "";
        }
    }
    return "";
}
YaripElementWhitelist.prototype.loadFromObject = function(obj)
{
    this.setName(obj.name);
    this.setExclusive(obj.exclusive);
    for each (var itemObj in obj.obj) {
        var item = new YaripElementWhitelistItem();
        item.loadFromObject(itemObj);
        this.add(item);
    }
}

function YaripElementBlacklist(name)
{
    this.name = "blacklist";
    this.obj = {};
    this.objId = {};
    this.listLength = 0;
    this.sorted = true;

    this.setName(name);
}
YaripElementBlacklist.prototype = new YaripList;
YaripElementBlacklist.prototype.constructor = YaripElementBlacklist;
YaripElementBlacklist.prototype.set = function(row, col, value)
{
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case 0:
            if (!this.checkXPath(value)) return false;

            var c = item.clone();
            c.setXPath(value);
            if (this.contains(c)) return false;

            FH.removeEntry("xpath", item.getXPath());
            this.remove(item);

            this.add(c);
            FH.addEntry("xpath", value);
            return c.getKey();
        case 1:
            var c = item.clone();
            c.setPriority(value);
            if (!this.contains(c)) {
                this.remove(item);
                this.add(c);
                return c.getKey();
            } else {
                return false;
            }
        case 2:
            item.setForce(value);
            return false;
        case 3:
            item.setPlaceholder(value);
            return false;
        default:
            return false;
        }
    }
    return false;
}
YaripElementBlacklist.prototype.get = function(row, col)
{
    if (!this.sorted) this.sort();
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case LIST_INDEX_KEY: return item.getKey();
        case 0: return item.getXPath();
        case 1: return item.getPriority();
        case 2: return item.getForce();
        case 3: return item.getPlaceholder();
        case 4:
            var ms = item.getCreated();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        case 5:
            var ms = item.getLastFound();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        case 6: return item.getFound();
        case 7: return item.getNotFound();
        case 8: return item.getIgnored();
        default: return "";
        }
    }
    return "";
}
YaripElementBlacklist.prototype.loadFromObject = function(obj)
{
    this.setName(obj.name);
    for each (var itemObj in obj.obj) {
        var item = new YaripElementBlacklistItem();
        item.loadFromObject(itemObj);
        this.add(item);
    }
}

function YaripElementAttributeList(name)
{
    this.name = "attribute";
    this.obj = {};
    this.objId = {};
    this.listLength = 0;
    this.sorted = true;

    this.setName(name);
}
YaripElementAttributeList.prototype = new YaripList;
YaripElementAttributeList.prototype.constructor = YaripElementAttributeList;
YaripElementAttributeList.prototype.set = function(row, col, value)
{
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case 0:
            if (!this.checkXPath(value)) return false;

            var c = item.clone();
            c.setXPath(value);
            if (this.contains(c)) return false;

            FH.removeEntry("xpath", item.getXPath());
            this.remove(item);

            this.add(c);
            FH.addEntry("xpath", value);
            return c.getKey();
        case 1:
            var c = item.clone();
            c.setName(value);
            if (this.contains(c)) return false;

//            FH.removeEntry("attribute_name", item.getName());
            this.remove(item);

            this.add(c);
            FH.addEntry("attribute_name", value);
            return c.getKey();
        case 2:
//            FH.removeEntry("attribute_value", item.getValue());

            item.setValue(value);
            FH.addEntry("attribute_value", value);
            return false;
        case 3:
            var c = item.clone();
            c.setPriority(value);
            if (!this.contains(c)) {
                this.remove(item);
                this.add(c);
                return c.getKey();
            } else {
                return false;
            }
        default:
            return false;
        }
    }
    return false;
}
YaripElementAttributeList.prototype.get = function(row, col)
{
    if (!this.sorted) this.sort();
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case LIST_INDEX_KEY: return item.getKey();
        case 0: return item.getXPath();
        case 1: return item.getName();
        case 2: return item.getValue();
        case 3: return item.getPriority();
        case 4:
            var ms = item.getCreated();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        case 5:
            var ms = item.getLastFound();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        case 6: return item.getFound();
        case 7: return item.getNotFound();
        default: return "";
        }
    }
    return "";
}
YaripElementAttributeList.prototype.loadFromObject = function(obj)
{
    this.setName(obj.name);
    for each (var itemObj in obj.obj) {
        var item = new YaripElementAttributeItem();
        item.loadFromObject(itemObj);
        this.add(item);
    }
}

function YaripElementScriptList(name)
{
    this.name = "script";
    this.obj = {};
    this.objId = {};
    this.listLength = 0;
    this.sorted = true;

    this.setName(name);
}
YaripElementScriptList.prototype = new YaripList;
YaripElementScriptList.prototype.constructor = YaripElementScriptList;
YaripElementScriptList.prototype.set = function(row, col, value)
{
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case 0:
            if (!this.checkXPath(value)) return false;

            var c = item.clone();
            c.setXPath(value);
            if (this.contains(c)) return false;

            FH.removeEntry("xpath", item.getXPath());
            this.remove(item);

            this.add(c);
            FH.addEntry("xpath", value);
            return c.getKey();
        case 1:
            var c = item.clone();
            c.setPriority(value);
            if (!this.contains(c)) {
                this.remove(item);
                this.add(c);
                return c.getKey();
            } else {
                return false;
            }
        case 99:
            item.setScript(value);
            return false;
        default:
            return false;
        }
    }
    return false;
}
YaripElementScriptList.prototype.get = function(row, col)
{
    if (!this.sorted) this.sort();
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case LIST_INDEX_KEY: return item.getKey();
        case 0: return item.getXPath();
        case 1: return item.getPriority();
        case 2:
            var ms = item.getCreated();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        case 3:
            var ms = item.getLastFound();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        case 4: return item.getFound();
        case 5: return item.getNotFound();
        case 99: return item.getScript();
        default: return "";
        }
    }
    return "";
}
YaripElementScriptList.prototype.loadFromObject = function(obj)
{
    this.setName(obj.name);
    for each (var itemObj in obj.obj) {
        var item = new YaripElementScriptItem();
        item.loadFromObject(itemObj);
        this.add(item);
    }
}

function YaripContentWhitelist(name, exclusive)
{
    this.name = "whitelist";
    this.obj = {};
    this.objId = {};
    this.listLength = 0;
    this.exclusive = false;
    this.sorted = true;

    this.setName(name);
    this.setExclusive(exclusive);
}
YaripContentWhitelist.prototype = new YaripList;
YaripContentWhitelist.prototype.constructor = YaripContentWhitelist;
YaripContentWhitelist.prototype.set = function(row, col, value)
{
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case 0:
            if (!this.checkRegExp(value)) return false;

            var c = item.clone();
            c.setRegExp(value);
            if (this.contains(c)) return false;

            FH.removeEntry("regexp", item.getRegExp());
            this.remove(item);

            this.add(c);
            FH.addEntry("regexp", value);
            return c.getKey();
        case 1:
            var c = item.clone();
            c.setPriority(value);
            if (!this.contains(c)) {
                this.remove(item);
                this.add(c);
                return c.getKey();
            } else {
                return false;
            }
        case 2:
            item.setForce(value);
            return false;
        default:
            return false;
        }
    }
    return false;
}
YaripContentWhitelist.prototype.get = function(row, col)
{
    if (!this.sorted) this.sort();
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case LIST_INDEX_KEY: return item.getKey();
        case 0: return item.getRegExp();
        case 1: return item.getPriority();
        case 2: return item.getForce();
        case 3:
            var ms = item.getCreated();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        case 4:
            var ms = item.getLastFound();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        default: return "";
        }
    }
    return "";
}
YaripContentWhitelist.prototype.loadFromObject = function(obj)
{
    this.setName(obj.name);
    this.setExclusive(obj.exclusive);
    for each (var itemObj in obj.obj) {
        var item = new YaripContentWhitelistItem();
        item.loadFromObject(itemObj);
        this.add(item);
    }
}

function YaripContentBlacklist(name)
{
    this.name = "blacklist";
    this.obj = {};
    this.objId = {};
    this.listLength = 0;
    this.sorted = true;

    this.setName(name);
}
YaripContentBlacklist.prototype = new YaripList;
YaripContentBlacklist.prototype.constructor = YaripContentBlacklist;
YaripContentBlacklist.prototype.set = function(row, col, value)
{
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case 0:
            if (!this.checkRegExp(value)) return false;

            var c = item.clone();
            c.setRegExp(value);
            if (this.contains(c)) return false;

            FH.removeEntry("regexp", item.getRegExp());
            this.remove(item);

            this.add(c);
            FH.addEntry("regexp", value);
            return c.getKey();
        case 1:
            var c = item.clone();
            c.setPriority(value);
            if (!this.contains(c)) {
                this.remove(item);
                this.add(c);
                return c.getKey();
            } else {
                return false;
            }
        case 2:
            item.setForce(value);
            return false;
        default:
            return false;
        }
    }
    return false;
}
YaripContentBlacklist.prototype.get = function(row, col)
{
    if (!this.sorted) this.sort();
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case LIST_INDEX_KEY: return item.getKey();
        case 0: return item.getRegExp();
        case 1: return item.getPriority();
        case 2: return item.getForce();
        case 3:
            var ms = item.getCreated();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        case 4:
            var ms = item.getLastFound();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        case 5: return item.getIgnored();
        default: return "";
        }
    }
    return "";
}
YaripContentBlacklist.prototype.loadFromObject = function(obj)
{
    this.setName(obj.name);
    for each (var itemObj in obj.obj) {
        var item = new YaripContentBlacklistItem();
        item.loadFromObject(itemObj);
        this.add(item);
    }
}

function YaripStreamReplaceList(name)
{
    this.name = "replace";
    this.obj = {};
    this.objId = {};
    this.listLength = 0;
    this.sorted = true;

    this.setName(name);
}
YaripStreamReplaceList.prototype = new YaripList;
YaripStreamReplaceList.prototype.constructor = YaripStreamReplaceList;
YaripStreamReplaceList.prototype.set = function(row, col, value)
{
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case 0:
            if (!this.checkRegExp(value)) return false;

            var c = item.clone();
            c.setRegExp(value);
            if (this.contains(c)) return false;

            FH.removeEntry("stream-regexp", item.getRegExp());
            this.remove(item);

            this.add(c);
            FH.addEntry("stream-regexp", value);
            return c.getKey();
        case 1:
            var c = item.clone();
            c.setPriority(value);
            if (!this.contains(c)) {
                this.remove(item);
                this.add(c);
                return c.getKey();
            } else {
                return false;
            }
        case 99:
            item.setScript(value);
            return false;
        default:
            return false;
        }
    }
    return false;
}
YaripStreamReplaceList.prototype.get = function(row, col)
{
    if (!this.sorted) this.sort();
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case LIST_INDEX_KEY: return item.getKey();
        case 0: return item.getRegExp();
        case 1: return item.getPriority();
        case 2:
            var ms = item.getCreated();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        case 3:
            var ms = item.getLastFound();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        case 99: return item.getScript();
        default: return "";
        }
    }
    return "";
}
YaripStreamReplaceList.prototype.loadFromObject = function(obj)
{
    this.setName(obj.name);
    for each (var itemObj in obj.obj) {
        var item = new YaripStreamItem();
        item.loadFromObject(itemObj);
        this.add(item);
    }
}

function YaripPageStyleList(name)
{
    this.name = "style";
    this.obj = {};
    this.objId = {};
    this.listLength = 0;
    this.sorted = true;

    this.setName(name);
}
YaripPageStyleList.prototype = new YaripList;
YaripPageStyleList.prototype.constructor = YaripPageStyleList;
YaripPageStyleList.prototype.set = function(row, col, value)
{
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case 0:
            if (!this.checkXPath(value)) return false;

            var c = item.clone();
            c.setXPath(value);
            if (this.contains(c)) return false;

            FH.removeEntry("xpath", item.getXPath());
            this.remove(item);

            this.add(c);
            FH.addEntry("xpath", value);
            return c.getKey();
        case 1:
            var c = item.clone();
            c.setPriority(value);
            if (!this.contains(c)) {
                this.remove(item);
                this.add(c);
                return c.getKey();
            } else {
                return false;
            }
        case 99:
            item.setStyle(value);
            return false;
        default:
            return false;
        }
    }
    return false;
}
YaripPageStyleList.prototype.get = function(row, col)
{
    if (!this.sorted) this.sort();
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case LIST_INDEX_KEY: return item.getKey();
        case 0: return item.getXPath();
        case 1: return item.getPriority();
        case 2:
            var ms = item.getCreated();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        case 3:
            var ms = item.getLastFound();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        case 4: return item.getFound();
        case 5: return item.getNotFound();
        case 99: return item.getStyle();
        default: return "";
        }
    }
    return "";
}
YaripPageStyleList.prototype.loadFromObject = function(obj)
{
    this.setName(obj.name);
    for each (var itemObj in obj.obj) {
        var item = new YaripStyleItem();
        item.loadFromObject(itemObj);
        this.add(item);
    }
}

function YaripPageScriptList(name)
{
    this.name = "script";
    this.obj = {};
    this.objId = {};
    this.listLength = 0;
    this.sorted = true;

    this.setName(name);
}
YaripPageScriptList.prototype = new YaripList;
YaripPageScriptList.prototype.constructor = YaripPageScriptList;
YaripPageScriptList.prototype.set = function(row, col, value)
{
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case 0:
            if (!this.checkXPath(value)) return false;

            var c = item.clone();
            c.setXPath(value);
            if (this.contains(c)) return false;

            FH.removeEntry("xpath", item.getXPath());
            this.remove(item);

            this.add(c);
            FH.addEntry("xpath", value);
            return c.getKey();
        case 1:
            var c = item.clone();
            c.setPriority(value);
            if (!this.contains(c)) {
                this.remove(item);
                this.add(c);
                return c.getKey();
            } else {
                return false;
            }
        case 99:
            item.setScript(value);
            return false;
        default:
            return false;
        }
    }
    return false;
}
YaripPageScriptList.prototype.get = function(row, col)
{
    if (!this.sorted) this.sort();
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case LIST_INDEX_KEY: return item.getKey();
        case 0: return item.getXPath();
        case 1: return item.getPriority();
        case 2:
            var ms = item.getCreated();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        case 3:
            var ms = item.getLastFound();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        case 4: return item.getFound();
        case 5: return item.getNotFound();
        case 99: return item.getScript();
        default: return "";
        }
    }
    return "";
}
YaripPageScriptList.prototype.loadFromObject = function(obj)
{
    this.setName(obj.name);
    for each (var itemObj in obj.obj) {
        var item = new YaripPageScriptItem();
        item.loadFromObject(itemObj);
        this.add(item);
    }
}

function YaripHeaderList(name)
{
    this.name = "header";
    this.obj = {};
    this.objId = {};
    this.listLength = 0;
    this.sorted = true;

    this.setName(name);
}
YaripHeaderList.prototype = new YaripList;
YaripHeaderList.prototype.constructor = YaripHeaderList;
YaripHeaderList.prototype.set = function(row, col, value)
{
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case 0:
            if (!this.checkRegExp(value)) return false;

            var c = item.clone();
            c.setRegExp(value);
            if (this.contains(c)) return false;

            FH.removeEntry("regexp", item.getRegExp());
            this.remove(item);

            this.add(c);
            FH.addEntry("regexp", value);
            return c.getKey();
        case 1:
            var c = item.clone();
            c.setHeaderName(value);
            if (this.contains(c)) return false;

//            FH.removeEntry("header_name", item.getHeaderName());
            this.remove(item);

            this.add(c);
            FH.addEntry("header_name", value);
            return c.getKey();
        case 2:
            var c = item.clone();
            c.setPriority(value);
            if (!this.contains(c)) {
                this.remove(item);
                this.add(c);
                return c.getKey();
            } else {
                return false;
            }
        case 3:
            item.setMerge(value);
            return false;
        case 99:
            item.setScript(value);
            return false;
        default:
            return false;
        }
    }
    return false;
}
YaripHeaderList.prototype.get = function(row, col)
{
    if (!this.sorted) this.sort();
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case LIST_INDEX_KEY: return item.getKey();
        case 0: return item.getRegExp();
        case 1: return item.getHeaderName();
        case 2: return item.getPriority();
        case 3: return item.getMerge();
        case 4:
            var ms = item.getCreated();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        case 5:
            var ms = item.getLastFound();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        case 99: return item.getScript();
        default: return "";
        }
    }
    return "";
}
YaripHeaderList.prototype.generateXml = function()
{
    var tmp = "";
    for each (var item in this.obj) if (item) tmp += item.generateXml();
    if (tmp != "") {
        return "\t\t\t\t" +
            "<" + this.name + ">\n" +
            tmp +
            "\t\t\t\t</" + this.name + ">\n";
    } else {
        return "";
    }
}
YaripHeaderList.prototype.loadFromObject = function(obj)
{
    this.setName(obj.name);
    for each (var itemObj in obj.obj) {
        var item = new YaripHeaderItem();
        item.loadFromObject(itemObj);
        this.add(item);
    }
}

function YaripRedirectList(name)
{
    this.name = "redirect";
    this.obj = {};
    this.objId = {};
    this.listLength = 0;
    this.sorted = true;

    this.setName(name);
}
YaripRedirectList.prototype = new YaripList;
YaripRedirectList.prototype.constructor = YaripRedirectList;
YaripRedirectList.prototype.set = function(row, col, value)
{
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case 0:
            if (!this.checkRegExp(value)) return false;

            var c = item.clone();
            c.setRegExp(value);
            if (this.contains(c)) return false;

            FH.removeEntry("regexp", item.getRegExp());
            this.remove(item);

            this.add(c);
            FH.addEntry("regexp", value);
            return c.getKey();
        case 1:
            FH.removeEntry("newsubstr", item.getRegExp());

            item.setNewSubStr(value);
            FH.addEntry("newsubstr", value);
            return false;
        case 2:
            var c = item.clone();
            c.setPriority(value);
            if (!this.contains(c)) {
                this.remove(item);
                this.add(c);
                return c.getKey();
            } else {
                return false;
            }
        default:
            return false;
        }
    }
    return false;
}
YaripRedirectList.prototype.get = function(row, col)
{
    if (!this.sorted) this.sort();
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case LIST_INDEX_KEY: return item.getKey();
        case 0: return item.getRegExp();
        case 1: return item.getNewSubStr();
        case 2: return item.getPriority();
        case 3:
            var ms = item.getCreated();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        case 4:
            var ms = item.getLastFound();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        default: return "";
        }
    }
    return "";
}
YaripRedirectList.prototype.loadFromObject = function(obj)
{
    this.setName(obj.name);
    for each (var itemObj in obj.obj) {
        var item = new YaripRedirectItem();
        item.loadFromObject(itemObj);
        this.add(item);
    }
}

function YaripPageExtensionList(name)
{
    this.id = null;
    this.name = "extension";
    this.obj = {};
    this.objId = {};
//    this.listLength = 0;
    this.sorted = true;

    this.setName(name);
}
YaripPageExtensionList.prototype = new YaripList;
YaripPageExtensionList.prototype.constructor = YaripPageExtensionList;
YaripPageExtensionList.prototype.set = function(row, col, value)
{
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        this.resetKnown();

        switch (col) {
        case 1:
            var c = item.clone();
            c.setPriority(value);
            if (!this.contains(c)) {
                this.remove(item);
                this.add(c);
                return [item, c];
            } else {
                return false;
            }
        case 2:
            item.setDoElements(value);
            break;
        case 3:
            item.setDoContents(value);
            break;
        case 4:
            item.setDoScripts(value);
            break;
        case 5:
            item.setDoHeaders(value);
            break;
        case 6:
            item.setDoRedirects(value);
            break;
        case 7:
            item.setDoStreams(value);
            break;
        case 8:
            item.setDoLinks(value);
            break;
        default:
            break;
        }

        break;
    }
    return false;
}
YaripPageExtensionList.prototype.get = function(row, col)
{
    if (!this.sorted) this.sort();
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        switch (col) {
        case LIST_INDEX_KEY: return item.getKey();
        case 0: return item.getPage().getName();
        case 1: return item.getPriority();
        case 2: return item.getDoElements();
        case 3: return item.getDoContents();
        case 4: return item.getDoScripts();
        case 5: return item.getDoHeaders();
        case 6: return item.getDoRedirects();
        case 7: return item.getDoStreams();
        case 8: return item.getDoLinks();
        case 9:
            var ms = item.getCreated();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        default: return "";
        }
    }
    return "";
}
YaripPageExtensionList.prototype.__defineGetter__("length", function() {
//        return this.listLength;
        var l = 0;
        for (var k in this.obj) { l++; }
        return l;
    });
YaripPageExtensionList.prototype.add = function(item, purge)
{
    if (!item) return false;

    var existItem = this.objId[item.getId()];
    if (existItem) {
        existItem.merge(item);
        if (purge) existItem.purge();
    } else {
        if (purge) item.purge();
        this.obj[item.getKey()] = item;
        this.objId[item.getId()] = item;
        this.sorted = false;
//        this.listLength++;
    }

    this.resetKnown();
    return true;
}
YaripPageExtensionList.prototype.setId = function(id)
{
    this.id = id;
}
YaripPageExtensionList.prototype.removeByKey = function(key)
{
    if (!key || !(key in this.obj)) return;

    this.remove(this.obj[key]);
    this.resetKnown();
}
YaripPageExtensionList.prototype.reset = function()
{
    this.obj = {};
    this.objId = {};
    this.listLength = 0;
    this.sorted = true;
    this.resetKnown();
}
YaripPageExtensionList.prototype.clone = function(purge)
{
    var tmp = new this.constructor(this.name);
    tmp.id = this.id;
    for each (var item in this.obj) if (item) tmp.add(item.clone(purge));
    return tmp;
}
YaripPageExtensionList.prototype.merge = function(list)
{
    for each (var item in list.obj) {
        if (item.getId() != this.id) this.add(item.clone());
    }
}
YaripPageExtensionList.prototype.loadFromObject = function(obj)
{
    this.setId(obj.id);
    this.setName(obj.name);
    for each (var itemObj in obj.obj) {
        var item = new YaripExtensionItem();
        item.loadFromObject(itemObj);
        this.add(item);
    }
}

function YaripPageExtendedByList()
{
    this.id = null;
    this.obj = {};
    this.objId = {};
//    this.listLength = 0;
    this.sorted = true;
}
YaripPageExtendedByList.prototype = new YaripList;
YaripPageExtendedByList.prototype.constructor = YaripPageExtendedByList;
YaripPageExtendedByList.prototype.set = function(row, col, value)
{
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        var page = item.getPage();
        var item2 = page.pageExtensionList.obj[new YaripExtensionItem(this.id, item.getPriority()).getKey()];

        this.resetKnown();

        switch (col) {
//        case 1:
//            var c = item.clone();
//            c.setPriority(value);
//            if (!this.contains(c)) {
//                this.remove(item);
//                this.add(c);
//                return c.getKey();
//            } else {
//                return false;
//            }
        case 2:
            item2.setDoElements(value);
            break;
        case 3:
            item2.setDoContents(value);
            break;
        case 4:
            item2.setDoScripts(value);
            break;
        case 5:
            item2.setDoHeaders(value);
            break;
        case 6:
            item2.setDoRedirects(value);
            break;
        case 7:
            item2.setDoStreams(value);
            break;
        case 8:
            item2.setDoLinks(value);
            break;
        default:
            break;
        }

        break;
    }
    return false;
}
YaripPageExtendedByList.prototype.get = function(row, col)
{
    if (!this.sorted) this.sort();
    var i = 0;
    for each (var item in this.obj)
    {
        if (i++ != row) continue;

        var page = item.getPage();
        var item2 = page.pageExtensionList.obj[new YaripExtensionItem(this.id, item.getPriority()).getKey()];
//        if (!item2) return;

        switch (col) {
        case LIST_INDEX_KEY: return item.getKey();
        case 0: return page.getName();
        case 1: return item.getPriority();
        case 2: return item2.getDoElements();
        case 3: return item2.getDoContents();
        case 4: return item2.getDoScripts();
        case 5: return item2.getDoHeaders();
        case 6: return item2.getDoRedirects();
        case 7: return item2.getDoStreams();
        case 8: return item2.getDoLinks();
        case 9:
            var ms = item2.getCreated();
            if (ms > -1) {
                var date = new Date(ms);
                return date.toDateString() + " " + date.toLocaleTimeString();
            } else {
                return "";
            }
        default: return "";
        }
    }
    return "";
}
YaripPageExtendedByList.prototype.__defineGetter__("length", function() {
//        return this.listLength;
        var l = 0;
        for (var k in this.obj) { l++; }
        return l;
    });
YaripPageExtendedByList.prototype.add = function(item, purge)
{
    if (!item) return false;

    var existItem = this.objId[item.getId()];
    if (existItem) {
        existItem.merge(item);
        if (purge) existItem.purge();
    } else {
        if (purge) item.purge();
        this.obj[item.getKey()] = item;
        this.objId[item.getId()] = item;
        this.sorted = false;
//        this.listLength++;
    }

    return true;
}
YaripPageExtendedByList.prototype.setId = function(id)
{
    this.id = id;
}
YaripPageExtendedByList.prototype.reset = function()
{
    this.obj = {};
    this.objId = {};
    this.listLength = 0;
    this.sorted = true;
}
YaripPageExtendedByList.prototype.clone = function(purge)
{
    var tmp = new this.constructor();
    tmp.id = this.id;
    for each (var item in this.obj) if (item) tmp.add(item.clone(purge));
    return tmp;
}
YaripPageExtendedByList.prototype.merge = function(list)
{
    for each (var item in list.obj) {
        if (item.getId() != this.id) this.add(item.clone());
    }
}
YaripPageExtendedByList.prototype.loadFromObject = function(obj)
{
    this.setId(obj.id);
    for each (var itemObj in obj.obj) {
        var item = new YaripExtensionItem();
        item.loadFromObject(itemObj);
        this.add(item);
    }
}

