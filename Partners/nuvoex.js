var Template = require('./template.js');
var querystring = require('querystring');
var _ = require("lodash");
var username = process.env["NUVOEX_USERNAME"];
var password = process.env["NUVOEX_PASSWORD"];
var host = process.env["NUVOEX_HOST"];
var auth = "Basic " + new Buffer(username + ":" + password).toString('base64');
var cities = [
'mumbai',
'navimumbai',
'lonavala',
'dombivali',
'thane',
'nerul',
'bhiwandi oul',
'raigarh(mh)'
]

var kolkata_cities = [
'kolkata',
'garia',
'south 24 parganas',
'howrah city',
'howrah countryside',
'bally',
'hooghly',
'north pargana',
'howrah',
]

var kolkata = {
	to_name : "Binay Kumar Mondal",
	to_mobile_number : "9831910854",
	to_address : "NuvoEx, Utsav Bhavan , Amta Road Near Dasnagar Police Station Howrah",
	to_pin_code : "711105"
}

var mumbai = {
	to_name : "Dattaraj",
	to_mobile_number : "8652175829",
	to_address : "B 15, Arihant Industrial Estate, Off Saki Vihar Road, Saki Naka Mumbai",
	to_pin_code : "400072"
}


// Declare partner specific variables here.
// Check out other partners for more information.

module.exports = Template.extend('NuvoEx', {

    init: function() {
	this._super(host);
    },
    
    order: function(params, cb) {
	var url = "/api/manifest/upload";
	// Check out Order schema file for more information.
	var awb = null;
	params.map([], {
	    "reference_number" : "AWB",
	    "invoice_number" : "CLIENT ORDER NO",
	    "from_name": "CUST NAME",
	    "from_address": "CUST ADDRESS LINE 1",
	    "from_city": ["CUST ADDRESS LINE 2", "CUST CITY"],
	    "from_pin_code": "Pincode",
	    "from_mobile_number": ["PHONE 1", "PHONE 2"],
	    "weight": "Weight",
	    "item_name": "PACKAGE DESCRIPTION",
	    "declared_value": "PACKAGE VALUE",
	    "reasons": "Reason for Return"
	}, function(inp) {
	    awb = inp.AWB;
	    var city = inp["to_city"].toLowerCase();
	    var from_city = inp['CUST CITY'].toLowerCase();
	    inp["Weight"] = Number(inp.Weight);
	    inp["Reason for Return"] = (inp["Reason for Return"]) ? inp["Reason for Return"] : "Not Applicable";
	    var item_details = {
	    	"item_id" : inp.order_ids[0],
	    	"product_name" : inp["PACKAGE DESCRIPTION"],
	    	"quantity" : inp.quantity
	    }
	    var item_object = inp.order_ids[0]+"";
	    inp["item_details"] = {};
	    inp["item_details"][item_object] = item_details;
	    inp["qc type"] = "doorstep";
	    var vendor_key = inp;
	    if(_.includes(cities,from_city)) {
	    	inp["vendor code"] = "ELC FEDEX";
	    	vendor_key = mumbai;
		}
		else if(_.includes(kolkata_cities,from_city)) {
			vendor_key = kolkata;
			inp["vendor code"] = "ELC Fedex KOL"
		}
	    else if (city.indexOf("new delhi") >= 0)
		inp["vendor code"] = "ELC WH - DELHI"
	    else
		inp["vendor code"] = "ELC WH - BANGALORE"
		inp["vendor name"] = vendor_key["to_name"];
		inp["vendor owner name"] = vendor_key["to_name"];
		inp["vendor pincode"] = vendor_key["to_pin_code"];
		inp["vendor address"] = vendor_key["to_address"];
		inp["vendor phone"] = vendor_key["to_mobile_number"];
	    return {
		data: JSON.stringify([inp]),
	    };
	});

	params.out_map({
	    "status": "success",
	    "msg": "err",
	}, function(out) {
	    if (String == out.constructor)
		out = JSON.parse(out);
	    if (out.error_data && awb in out.error_data)
		out.err = out.error_data[awb];
	    else
		out.awb = awb;
	    return out;
	});
	var body = querystring.stringify(params.get());
	return this.post_req(url, params, cb, { headers: {
	    "Authorization": auth,
	    "Content-Type": 'application/x-www-form-urlencoded',
	}, json: null, body: body});
    },

    track: function(params, cb) {
	params.set({"tracking_url": this.get_tracking_url(params.get().awb_number) });
	return cb(null, params);
    },

    get_tracking_url: function(awb) {
	var url = "http://www.nuvoex.com/awb_detail.html?awb=";
	url += awb;
	return url;
    },

    single_tracking_status: function(params, cb) {
	var url = "http://ship.nuvoex.com/transit/tracking/awb/" + params.get().awb_number;
	var awb = params.get().awb_number;
	params.set({});

	params.out_map({
	}, function(out) {
	    if (String == out.constructor)
		out = JSON.parse(out);
	    
	    if (out.history) {
		out.success = true;
		out.error = "";
		var details = [];
		for (key in out.history) {
		    var status = out.history[key];
		    status.description = status.remark;
		    status.location = status.branch;
		    details.push(status);
		}
		out.details = details;
	    }
	    else {
		out.success = false;
		out.error = "Invalid AWB";
	    }
	    out.awb = awb;
	    return out;
	});

	return this.get_req(url, params, cb, {url: url});
    },

    cancel: function(params, cb) {
	var url = "/api/awb/update/cancel/";
	var awb = null;
	params.map([], {
	    "awb" : "awbs",
	}, function(inp) {
	    awb = inp.awbs;
	    inp.awbs = [inp.awbs];
	    return inp;
	});

	params.out_map({
	    "status": "success",
	    "msg": "err",
	}, function(out) {
	    if (String == out.constructor)
		out = JSON.parse(out);
	    if (!out.success && out.rejected_awbs)
		out.err = out.rejected_awbs[awb];
	    return out;
	});

	var body = querystring.stringify(params.get());
	return this.post_req(url, params, cb, { headers: {
	    "Authorization": auth,
	    "Content-Type": 'application/x-www-form-urlencoded',
	}, json: null, body: body});
    },

});
