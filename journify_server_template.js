// import dependencies
const getEventData = require('getEventData');
const getTimestampMillis = require('getTimestampMillis');
const getRemoteAddress = require('getRemoteAddress');
const sendHttpRequest = require('sendHttpRequest');
const JSON = require('JSON');
const log = require('logToConsole');
const parseUrl = require('parseUrl');

// define functions
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

function getContext(){
    const context = {
        userAgent: getEventData('user_agent'),
        page: getPageProperties(),
        locale: getEventData('language'),
        ip: getRemoteAddress(),
        library: {
            name: "journifyio-server-gtm",
        },
        session: {
            id: getEventData('ga_session_id'),
        }
    }

    const utmCampaign = getUtmCampaign();
    if (utmCampaign) {
        context.campaign = utmCampaign;
    }

    return context;
}

function getPageProperties() {
    const pageKeysMapping = {
        "page_referrer": "referrer",
        "page_title": "title",
        "page_path": "path",
        "page_location": "url",
    }

    const templatePage =  getEventDataKeys(Object.keys(pageKeysMapping));
    const domainPage = {};
    for (let key in pageKeysMapping) {
        const domainKey = pageKeysMapping[key];
        domainPage[domainKey] = templatePage[key];
    }

    return domainPage;
}

function getUtmCampaign() {
    const parsedUrl = parseUrl(getEventData('page_location'));
    if (parsedUrl && Object.keys(parsedUrl.searchParams).length > 0) {
        const utmKeysMapping = {
            "utm_source": "source",
            "utm_medium": "medium",
            "utm_campaign": "campaign",
            "utm_term": "term",
            "utm_content": "content",
        }

        let campaignFound = false;
        const utmCampaign = {};

        for (let key in utmKeysMapping) {
            const paramValue = parsedUrl.searchParams[key]
            if (paramValue) {
                campaignFound = true;
                const domainKey = utmKeysMapping[key]
                utmCampaign[domainKey] = paramValue;
            }
        }

        return campaignFound ? utmCampaign : null;
    }

    return null;
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

function copyObj(target, source) {
    for (let key in source) {
        target[key] = source[key];
    }
}

// create event
const eventName = getEventName();
const eventType = getEventType(eventName);
if (!eventType) {
    log('No event name match, aborting event dispatch.');
    return data.gtmOnSuccess();
}

const timestamp = getTimestampMillis();
const client_id = getEventData('client_id');
const user_id = getEventData('user_id');
const message_id = user_id + client_id + eventName + timestamp;

const event = {
    type: eventType,
    name: eventName,
    anonymousId: client_id,
    userId: user_id,
    writeKey: data.write_key,
    timestamp: new Date(timestamp),
    messageId : message_id,
    traits: getUserTraits(),
    context: getContext(),
    properties: getEventProperties(),
};

if (eventType === 'page') {
    event.name = getEventData('page_title');
}

// send event
const queryEndpoint = data.api_endpoint && data.api_endpoint.length > 0 ? data.api_endpoint : "https://t.journify.dev/v1/t";

const queryCallback = (statusCode, headers, body) => {
    log("response", "statusCode: ", statusCode, "body: ", JSON.stringify(body));
    if (statusCode >= 400) {
        data.gtmOnFailure();
    } else {
        data.gtmOnSuccess();
    }
}

const queryOptions = {
    headers: {'content-type': 'application/json'},
    method: 'POST',
    timeout: 2000,
};
const queryBody = JSON.stringify(event);

sendHttpRequest(queryEndpoint, queryCallback, queryOptions, queryBody);