var Template = require('./template.js');
var querystring = require('querystring');
var _ = require("lodash");
const unirest = require('unirest');

var host = process.env['RAPID_HOST'];
const client = process.env['RAPID_CLIENT'];
const token = process.env['RAPID_TOKEN'];

// Declare partner specific variables here.
// Check out other partners for more information.

module.exports = Template.extend('Rapid', {

    init: function() {
	this._super(host);
    },

    order: function(params, cb) {
	var url = `${host}/api/createpackage`;
	// Check out Order schema file for more information.

  const inp = params.get();
  if(_.isEmpty(inp.from_address_line_1)) { 
    inp.from_address_line_1 = inp.from_address;
  }
  if(_.isEmpty(inp.to_address_line_1)) {
    inp.to_address_line_1 = inp.to_address;
  }
  let req = {};

  if (inp.order_type === "pickup" || inp.order_type==="return_pickup") {
    req = {
      client,
      token,
      oid: inp.invoice_number,
      consignee: inp.from_name,
      add1: inp.from_address_line_1,
      add2: inp.from_address_line_2,
      pin: inp.from_pin_code,
      city: inp.from_city,
      state: inp.from_state,
      country: inp.from_country,
      phone: inp.from_mobile_number,
      weight: 0.4,
      mode: "reverse",
      ret_add: inp.to_address_line_1 + inp.to_address_line_2,
      ship_pin: inp.to_pin_code,
      ship_phone: inp.to_mobile_number,
      ship_company: 'Elanic',
      amt: inp.declared_value,
      product: inp.item_name
    }
  }

  const postReq = unirest.post(url);
  postReq.header('Content-Type', 'application/x-www-form-urlencoded');

  for (let key in req) {
    postReq.send(`${key}=${req[key]}`);
  }

  postReq.end((response) => {
    const body = _.get(response, "body");
    if (_.isEmpty(body)) {
      params.set({
        success: false,
        err: "Rapid Unknown Error"
      });
    }
    // RAPID IS FUCKED UP - THEY DON'T SEND PROPER ERROR/SUCCESS RESPONSE CODES.
    // HENCE USING LENGTH of body as the success as a hack
    if (_.toNumber(body)) {
      params.set({
        success: true,
        tracking_url: this.get_tracking_url(body),
        awb: body
      });
    } else {
      params.set({
        success: false,
        err: body
      });
    }
    return cb(response, params);
  });


	// params.map([], {
	// }, function(inp) {
  //
  //
  //
	//     // return req;
	// });
  //
	// params.out_map({
	// }, function(out) {
	//    console.log(out);
	//    return out;
	// });
  //
	// // return this.post_req(url, params, cb);
  },

    track: function(params, cb) {
	params.set({
	    "tracking_url": this.get_tracking_url(params.get().awb_number),
	});
	return cb(null, params);
    },

    get_tracking_url: function(awb) {
      return `${host}/api/track.php?client=${client}&token=${token}&waybill=${awb}`;
    },

    single_tracking_status: function (params, cb) {
      const awb = params.get().awb_number;
      const url = `${host}/api/track.php?client=${client}&token=${token}&waybill=${params.get().awb_number}`;
      const headers = {};
      params.out_map({
        "err": "error"
      }, (out) => {
        if (String == out.constructor) out = JSON.parse(out);
        if (out.scans) {
          var details = out.scans.map((scan) => {
            return {
              "time": scan.timestamp,
              "status": `${scan.flow}_${scan.status}`,
              "description": scan.remarks,
            }
          });
          var res = {
            success: true,
            awb,
            details
          }
        }
        return res;
      })
      return this.get_req(url, params, cb, {url, headers});
    },

    cancel: function(params, cb) {
	var url = "/api/packages/cancel/";
	params.map(["to_be_omitted_1", "to_be_omitted_2"], {
	    "from_mapping_1" : "to_mapping_1",
	    "from_mapping_2" : "to_mapping_2",
	}, function(inp) {
	    return _.extend({
		"auth_token": 'sfwerlkjwevs',
	    }, inp);
	});

	params.out_map({}, function(out) {
	    out.success = !Boolean(out.err);
	    return out;
	});

	return this.post_req(url, params, cb);
    },

});
