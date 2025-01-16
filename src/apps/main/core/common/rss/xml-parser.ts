//RSSのパーサー(Thank you, NyanRus!)
export function parseXML(xml: string) {
    const parser = new DOMParser();
    const xmldoc = parser.parseFromString(xml,"text/xml");

    if (xmldoc.documentElement) {
    return {[xmldoc.documentElement.nodeName]:_parseXMLElement(xmldoc.documentElement)};
    } else {
    return null;
    }
}

function _parseXMLElement(elem: Element) {
    const attrList: Record<string,string> = {};
    if (elem.attributes) {
    for (let i = 0; i < elem.attributes.length; i++) {
        const attr = elem.attributes.item(i)!;
        attrList[attr.name] = attr.value;
    }
    }
    let ret: Record<string,object | string> = {}
    if (Object.keys(attrList).length !== 0) {
    ret = {...ret,$attr:attrList};
    }
    if (elem.children.length) {
    for (const child of elem.children) {
        if (Object.keys(ret).includes(child.nodeName)) {
        if (Array.isArray(ret[child.nodeName])) {
            ret[child.nodeName] = [...(ret[child.nodeName] as Array<unknown>),_parseXMLElement(child)];
        } else {
            ret[child.nodeName] = [ret[child.nodeName],_parseXMLElement(child)];
        }
        } else {
        ret[child.nodeName] = _parseXMLElement(child);
        }
    }
    } else {
    ret["$text"] = elem.textContent ?? "";
    }
    return ret;
}