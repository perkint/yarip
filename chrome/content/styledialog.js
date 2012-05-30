
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

function YaripAttributeDialog()
{
    this.pageMenulist = null;
    this.xpathTextbox = null;
    this.attrNameTextbox = null;
    this.attrValueTextbox = null;
    this.doc = null;
    this.obj = null;
    this.xValue = null;

    this.setXPath = function(value)
    {
        if (!this.obj) return;
        this.obj.item.setXPath(value);
    }

    this.setAttrName = function(value)
    {
        if (!this.obj) return;
        this.obj.attrName = value;
        if (this.obj.node) this.setAttrValue(this.obj.node.getAttribute(value), true);
    }

    this.setAttrValue = function(value, update)
    {
        if (!this.obj || !value) return;
        this.obj.attrValue = value;
        if (update) this.attrValueTextbox.value = value;
    }

    this.highlight = function()
    {
        if (!this.doc) return;

        if (this.xValue) this.unHighlight(this.doc, this.xValue);
        this.xValue = null;
        var xValue = this.obj.item.getXPath();
        if (!yarip.highlight(this.doc, xValue))
        {
            var msg = this.stringbundle.getString("ERR_INVALID_XPATH");
            alert(msg);
            throw new YaripException(msg);
        }
        this.xValue = xValue;
    }

    this.unHighlight = function(doc, xValue)
    {
        yarip.unHighlight(doc, xValue);
    }

    this.removeIndexes = function()
    {
        var xValue = this.xpathTextbox.value.replace(/\[\d+\]/g, "");
        this.xpathTextbox.value = xValue;
        this.setXPath(xValue);
    }

    this.load = function()
    {
        if (!("arguments" in window) || window.arguments.length < 2) return;

        this.doc = window.arguments[0];
        this.obj = window.arguments[1];
        if (!this.obj) return;

        this.stringbundle = document.getElementById("style-dialog-stringbundle");
        this.pageMenulist = document.getElementById("page");
        this.xpathTextbox = document.getElementById("xpath");
        this.attrNameTextbox = document.getElementById("attrName");
        this.attrValueTextbox = document.getElementById("attrValue");

        this.pageMenulist.value = this.obj.pageName;
        this.xpathTextbox.value = this.obj.item.getXPath();
        this.xpathTextbox.focus();
        this.xpathTextbox.select();
        this.attrNameTextbox.value = this.obj.attrName;
        this.attrValueTextbox.value = this.obj.attrValue;

        if (!this.doc) {
            this.pageMenulist.disabled = true;
            document.getElementById("highlight").disabled = true;
            return;
        }

        var location = yarip.getLocationFromLocation(this.doc.location);
        if (location) {
            var aMap = yarip.getAddressMap(location.asciiHref, true, { content: true });
            aMap.add(new YaripPage(null, yarip.getPageName(location, MODE_PAGE)));
            aMap.add(new YaripPage(null, yarip.getPageName(location, MODE_FQDN)));
            aMap.add(new YaripPage(null, yarip.getPageName(location, MODE_SLD)));
            var menupopup = document.getElementById("page-menupopup");
            var createMenuitem = this.createMenuitem;
            aMap.tree.traverse(function(node) { if (node.value) createMenuitem(menupopup, node.value.getName()); });
        } else {
            this.pageMenulist.disabled = true;
            return;
        }
    }

    this.createMenuitem = function(menupopup, address)
    {
        if (!address) return;

        var menuitem = document.createElement("menuitem");
        menuitem.setAttribute("label", address);
        menuitem.setAttribute("value", address);
        menupopup.appendChild(menuitem);
    }

    this.accept = function()
    {
        if (this.doc) {
            this.unHighlight(this.doc, this.xValue);
            if (!this.obj || !this.obj.attrName || this.obj.attrName === "") return;

            this.obj.pageName = this.pageMenulist.value;

            var elements = yarip.getElements(this.doc, this.obj.item.getXPath());
            if (!elements)
            {
                var msg = this.stringbundle.getString("ERR_INVALID_XPATH");
                alert(msg);
                throw new YaripException(msg);
            }
        } else {
            if (!this.obj) return;
            if (!yarip.checkXPath(this.obj.item.getXPath()))
            {
                var msg = this.stringbundle.getString("ERR_INVALID_XPATH");
                alert(msg);
                throw new YaripException(msg);
            }
        }

        FH.addEntry("xpath", this.obj.item.getXPath());
        FH.addEntry("attribute_name", this.obj.attrName);
        FH.addEntry("attribute_value", this.obj.attrValue);

        return;
    }

    this.cancel = function()
    {
        if (this.doc) this.unHighlight(this.doc, this.xValue);
        if (this.obj) this.obj.item = null;
    }
}
