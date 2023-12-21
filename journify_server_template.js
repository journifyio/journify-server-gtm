const getEventData = require('getEventData');
const sendHttpRequest = require('sendHttpRequest');
const JSON = require('JSON');
const log = require('logToConsole');

const HTTP_ENDPOINT = "https://t.journify.dev/v1/t";

function copyObj(target, source) {
    for (let key in source) {
        target[key] = source[key];
    }
}

function postCallback(statusCode, headers, body) {
    log("response", "statusCode: ", statusCode, "body: ", JSON.stringify(body));
    if (statusCode >= 400) {
        data.gtmOnFailure();
    } else {
        data.gtmOnSuccess();
    }
}

function getEventProperties() {
    const propertyKeys = [
        "currency",
        "value",
        "login_status",
        "eventID",
        "contents",
        "content_ids",
        "content_type",
        "content_category",
        "content_name",
        "predicted_ltv",
        "num_items",
        "order_id",
        "coupon",
        "payment_type",
        "items",
        "shipping_tier",
        "virtual_currency_name",
        "group_id",
        "level_name",
        "success",
        "level",
        "character",
        "method",
        "score",
        "level",
        "character",
        "transaction_id",
        "shipping",
        "tax",
        "search_term",
        "content_id",
        "item_list_id",
        "item_list_name",
        "creative_name",
        "creative_slot",
        "promotion_id",
        "promotion_name",
        "item_name",
        "achievement_id",
    ]
    const properties = getEventDataKeys(propertyKeys);

    const nestedProps = getEventData('properties');
    if (nestedProps) {
        copyObj(properties, nestedProps);
    }

    const ecommerce = getEventData('ecommerce');
    if (ecommerce) {
        copyObj(properties, ecommerce);
    }

    copyObj(properties, ecommerce);
}

function getPageProperties() {
    const pageKeysMapping = {
        "page_title": "title",
        "page_hostname": "hostname",
        "page_location": "location",
        "page_path": "path",
        "page_referrer": "referrer",
    }

    const templatePage =  getEventDataKeys(Object.keys(pageKeysMapping));
    const domainPage = {};
    for (let key in pageKeysMapping) {
        const domainKey = pageKeysMapping[key];
        domainPage[domainKey] = templatePage[key];
    }

    return domainPage;
}

function getEventDataKeys(keys){
    const object = {};
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = getEventData(key);
        if (value) {
            object[key] = value;
        }
    }

    return object
}

function getUserTraits() {
    const traitKeysMapping = {
        "user_data.email_address": "email",
        "user_data.phone_number": "phone",
        "user_data.first_name": "firstName",
        "user_data.last_name": "lastName",
        "user_data.street": "street_address",
        "user_data.city": "city",
        "user_data.region": "state_code",
        "user_data.postal_code": "postal_code",
        "user_data.country": "country_code",
    }
    const templateTraits =  getEventDataKeys(Object.keys(traitKeysMapping));

    const domainTraits = {};
    for (let key in templateTraits) {
        const domainKey = traitKeysMapping[key];
        domainTraits[domainKey] = templateTraits[key];
    }

    return domainTraits;
}

function getEventName() {
    let eventName = getEventData('event_name');
    if (!eventName) {
        eventName = getEventData('event');
    }
    return eventName;
}

function getEventType(eventName) {
    let eventType = null;
    for (let i = 0; i < data.event_mappings.length; i++) {
        if (data.event_mappings[i].event_name === eventName) {
            eventType = data.event_mappings[i].event_type;
            break;
        }
    }
}

const eventName = getEventName();
const eventType = getEventType(eventName);
if (!eventType) {
    log('No event name match, aborting event dispatch.');
    return data.gtmOnSuccess();
}

const event = {
    type: eventType,
    anonymousId: getEventData('client_id'),
    userId: getEventData('user_id'),
    writeKey: data.write_key,
    traits: getUserTraits(),
};

switch (eventType) {
    case 'page':
        const properties = getEventProperties();
        const pageProperties = getPageProperties();
        copyObj(properties, pageProperties);

        pageEvent = {
            name: getEventData('page_title'),
            properties: properties,
        }

        copyObj(event, pageEvent);
        break;

    case 'screen':
        break;

    case 'track':
        break;

    case 'identify':
        break;
}


const options = {
    headers: {'content-type': 'application/json'},
    method: 'POST',
    timeout: 2000,
};

sendHttpRequest(HTTP_ENDPOINT, postCallback, options, JSON.stringify(event));