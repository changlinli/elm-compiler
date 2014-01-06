Elm.Native.Utils = {};
Elm.Native.Utils.make = function(elm) {

    elm.Native = elm.Native || {};
    elm.Native.Utils = elm.Native.Utils || {};
    if (elm.Native.Utils.values) return elm.Native.Utils.values;

    function eq(x,y) {
        if (x === y) return true;
        if (typeof x === "object") {
            var c = 0;
            for (var i in x) { ++c; if (!eq(x[i],y[i])) return false; }
            return c === Object.keys(y).length;
        }
        if (typeof x === 'function') {
            throw new Error('Equality error: general function equality is ' +
                            'undecidable, and therefore, unsupported');
        }
        return x === y;
    }

    // code in Generate/JavaScript.hs depends on the particular
    // integer values assigned to LT, EQ, and GT
    var LT = -1, EQ = 0, GT = 1, ord = ['LT','EQ','GT'];
    function compare(x,y) { return { ctor: ord[cmp(x,y)+1] } }
    function cmp(x,y) {
        var ord;
        if (typeof x !== 'object' || x instanceof String){
            return x === y ? EQ : x < y ? LT : GT;
        }

        if (x.ctor === "::" || x.ctor === "[]") {
            while (true) {
                if (x.ctor === "[]" && y.ctor === "[]") return EQ;
                if (x.ctor !== y.ctor) return x.ctor === '[]' ? LT : GT;
                ord = cmp(x._0, y._0);
                if (ord !== EQ) return ord;
                x = x._1;
                y = y._1;
            }
        }

        if (x.ctor.slice(0,6) === '_Tuple') {
            var n = x.ctor.slice(6) - 0;
            var err = 'cannot compare tuples with more than 6 elements.';
            if (n === 0) return EQ;
            if (n >= 1) { ord = cmp(x._0, y._0); if (ord !== EQ) return ord;
            if (n >= 2) { ord = cmp(x._1, y._1); if (ord !== EQ) return ord;
            if (n >= 3) { ord = cmp(x._2, y._2); if (ord !== EQ) return ord;
            if (n >= 4) { ord = cmp(x._3, y._3); if (ord !== EQ) return ord;
            if (n >= 5) { ord = cmp(x._4, y._4); if (ord !== EQ) return ord;
            if (n >= 6) { ord = cmp(x._5, y._5); if (ord !== EQ) return ord;
            if (n >= 7) throw new Error('Comparison error: ' + err); } } } } } }
            return EQ;
        }
        throw new Error('Comparison error: comparison is only defined on ints, ' +
                        'floats, times, chars, strings, lists of comparable values, ' +
                        'and tuples of comparable values.')
    }


    var Tuple0 = { ctor: "_Tuple0" };
    function Tuple2(x,y) { return { ctor:"_Tuple2", _0:x, _1:y } }

    function chr(c) {
        var x = new String(c);
        x.isChar = true;
        return x;
    }

    function txt(str) {
        var t = new String(str);
        t.text = true;
        return t;
    }

    function makeText(style, text) {
        var style = style;
        var line = '';
        var href = '';
        while (true) {
            if (text.line) {
                line += text.line;
                text = text.text;
                continue;
            }
            if (text.style) {
                style += text.style;
                text = text.text;
                continue;
            }
            if (text.href) {
                href = text.href;
                text = text.text;
                continue;
            }
            if (href) text = '<a href="' + href + '">' + text + '</a>';
            if (line) style += 'text-decoration:' + line + ';';
            if (style) text = '<span style="' + style + '">' + text + '</span>';
            return text;
        }
    }

    var count = 0;
    function guid(_) { return count++ }

    function copy(r) {
        var o = {};
        for (var i in r) { o[i] = r[i]; }
        return o;
    }

    function remove(x,r) {
        var o = copy(r);
        if (x in o._) {
            o[x] = o._[x][0];
            o._[x] = o._[x].slice(1);
            if (o._[x].length === 0) { delete o._[x]; }
        } else {
            delete o[x];
        }
        return o;
    }

    function replace(kvs,r) {
        var o = copy(r);
        for (var i = kvs.length; i--; ) {
            var kvsi = kvs[i];
            o[kvsi[0]] = kvsi[1];
        }
        return o;
    }

    function insert(x,v,r) {
        var o = copy(r);
        if (x in o) o._[x] = [o[x]].concat(x in o._ ? o._[x].slice(0) : []);
        o[x] = v;
        return o;
    }

    function max(a,b) { return a > b ? a : b }
    function min(a,b) { return a < b ? a : b }

    function mod(a,b) {
        if (b === 0) {
            throw new Error("Cannot perform mod 0. Division by zero error.");
        }
        var r = a % b;
        var m = a === 0 ? 0 : (b > 0 ? (a >= 0 ? r : r+b) : -mod(-a,-b));

        return m === b ? 0 : m;
    }

    function htmlHeight(width, rawHtml) {
        // create dummy node
        var html = rawHtml.html;
        var t = document.createElement('div');
        t.innerHTML = html;
        if (width > 0) { t.style.width = width + "px"; }
        t.style.visibility = "hidden";
        t.style.styleFloat = "left";
        t.style.cssFloat   = "left";

        document.body.appendChild(t);

        // insert interpolated values
        var args = rawHtml.args;
        var guid = rawHtml.guid;
        for (var i = args.length; i--; ) {
            var arg = args[i];
            var span = document.getElementById('md-' + guid + '-' + i);
            if (arg.isElement) {
                span.style.width = arg.props.width + 'px';
                span.style.height = arg.props.height + 'px';
            } else {
                span.innerHTML = arg;
            }
        }

        // get dimensions
        var style = window.getComputedStyle(t, null);
        var w = Math.ceil(style.getPropertyValue("width").slice(0,-2) - 0);
        var h = Math.ceil(style.getPropertyValue("height").slice(0,-2) - 0);
        document.body.removeChild(t);
        return Tuple2(w,h);
    }

    function getXY(e) {
        var posx = 0;
        var posy = 0;
        if (e.pageX || e.pageY) {
            posx = e.pageX;
            posy = e.pageY;
        } else if (e.clientX || e.clientY) {
            posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }

        if (elm.display === ElmRuntime.Display.COMPONENT) {
            var rect = elm.node.getBoundingClientRect();
            var relx = rect.left + document.body.scrollLeft + document.documentElement.scrollLeft;
            var rely = rect.top + document.body.scrollTop + document.documentElement.scrollTop;
            // TODO: figure out if there is a way to avoid rounding here
            posx = posx - Math.round(relx) - elm.node.clientLeft;
            posy = posy - Math.round(rely) - elm.node.clientTop;
        }
        return Tuple2(posx, posy);
    }

    function portCheck(moduleName, ports) {
        var expected = {};
        for (var i = ports.length; i--; ) {
            expected[ports[i]] = 1;
        }
        for (var key in elm.ports_in) {
            expected[key] = expected[key] || 0;
            expected[key] -= 1;
        }
        var missing = [];
        var extra = [];
        for (var key in expected) {
            var result = expected[key];
            if (result > 0) missing.push(key);
            if (result < 0) extra.push(key);
        }
        if (missing.length > 0) {
            throw new Error("Initialization Error: module " + moduleName +
                            " was not given inputs for the following ports: " +
                            missing.join(', '));
        }
        if (extra.length > 0) {
            throw new Error(
                "Initialization Error: module " + moduleName +
                " has been given ports that do not exist: " + extra.join(', '));
        }
    }

    // On failure, return message. On success, return the value in an array.
    // Wrapping in an array allows the programmer to pass in a null value.
    function processInput(converter, v) {
        try { var elmValue = converter(v); }
        catch(e) { return "The given value caused a runtime error!\n" + e.toString(); }

        var ctor = elmValue.ctor;
        if (ctor === 'Nothing' || ctor === 'Left') {
            return "The port's conversion function failed.";
        } else if (ctor === 'Just' || ctor === 'Right') {
            return [elmValue._0];
        }
        return [elmValue];
    }
    function portIn(name, converter) {
        var port = elm.ports_in[name];
        var result = processInput(converter, port.defaultValue);
        if (typeof result === 'string') {
            throw new Error("Initialization Error: The default value for port '" +
                            name + "' is invalid.\n" + result);
        }
        var signal = Signal.constant(result[0]);
        port.subscribe(function(v) {
            var result = processInput(converter, v);
            if (typeof result === 'string') {
                port.errorHandler(v)
            } else {
                elm.notify(signal.id, result[0]);
            }
        });
        return signal;
    }
    function portOut(name, signal) {
        var subscribers = []
        function subscribe(handler) {
            subscribers.push(handler);
        }
        function unsubscribe(handler) {
            subscribers.pop(subscribers.indexOf(handler));
        }
        Signal.lift(function(value) {
            var len = subscribers.length;
            for (var i = 0; i < len; ++i) {
                subscribers[i](value);
            }
        }, signal);
        elm.ports_out[name] = { subscribe:subscribe, unsubscribe:unsubscribe };
        return signal;
    }

    return elm.Native.Utils.values = {
        eq:eq,
        cmp:cmp,
        compare:F2(compare),
        Tuple0:Tuple0,
        Tuple2:Tuple2,
        chr:chr,
        txt:txt,
        makeText:makeText,
        copy: copy,
        remove: remove,
        replace: replace,
        insert: insert,
        guid: guid,
        max : F2(max),
        min : F2(min),
        mod : F2(mod),
        htmlHeight: F2(htmlHeight),
        getXY: getXY,
        toFloat: function(x) { return +x; },
        portCheck: portCheck,
        portOut: portOut,
        portIn: portIn
    };
};
