(function (module, require) {
   // for making sync APIs
   var deasync = require("deasync")
   // if jar is true, the request handle would remember cookies for future use
   var session = require("request").defaults({jar: true})
   // For parsing html, not a memory leaker like cheerio
   var whacko = require("whacko")
   // var URL = require("url")

   // Method for making sync http request to simplyfy the api
   var get = deasync(function (options, cb) {
      session.get(options, function (err, resp) {
         if (err || resp.statusCode !== 200) {
            cb(null, {
               err: err.toString(),
               resp: null
            })
         } else {
            cb(null, {
               err: resp,
               resp: null
            })
         }
      })
   })

   // Constructor function
   function gsearch(options) {
      if (!(this instanceof gsearch)) { 
         return new gsearch(options)
      }
      var self = this
      self.options = options
      self.params = {}
      self.host = "https://www.google.com"
   }
   
   gsearch.prototype.get = function (searchString, cb) {
      var self = this

      self.params.q = searchString
      
      // Requesting page
      var firstResp = get({
         uri: url + "/search",
         qs: self.params,
         followRedirect: false
      })

      if (!firstResp.err) {
         cb(null, firstResp)      
         return
      }
      // 302 means captcha case
      if (firstResp.resp.statusCode === 302) {
         console.log("Captcha Case")
         var solvedResp = self.solveCaptcha(firstResp.resp)
         cb(null, solvedResp)
      }
   }

   // Sync function
   gsearch.prototype.getSync = deasync(gsearch.prototype.get)

   gsearch.prototype.solveCaptcha = function (googleCaptchaHtml) {
      var self = this

      var $ = whacko.load(googleCaptchaHtml.body)
      var captchaId = $('input[name=id]').attr('value');
      var continueUrl = $('input[name=continue]').attr('value')
      var formAction = $('form').attr('action')
      var imgURL = $('img').attr('src')

      // Getting captcha image
      var imgResp = self.get({
         url: imgURL,
         encoding: null
      })
      if (imgResp.err) { return imgResp }

      // Solving captcha
      var captchaResp = getCaptchaSolved(imgResp.resp.body)
      if (captchaResp.err) { return captchaResp }

      // Trying solution
      //https://www.google.co.in/search?q=suresh%20chauhan%20linkedin&google_abuse=GOOGLE_ABUSE_EXEMPTION%3DID%3D2e4a020e39dddc18:TM%3D1470951076:C%3Dc:IP%3D122.172.176.63-:S%3DAPGng0tdGEfgxDpgo3THOg21AQu6fdvXBA%3B+path%3D/%3B+domain%3Dgoogle.com%3B+expires%3DFri,+12-Aug-2016+00:31:16+GMT

      var secondResp = get({
         uri: self.host + "/sorry/" + formAction,
         qs: {
            id: captchaId,
            captcha: captchaResp.solution,
            continue: continueUrl
         }
      })

      return secondResp
   }

   gsearch.prototype.getCaptchaSolved = deasync(function (img, cb) {
      self.options.solver.solve(img, function (err, id, solution) {
         if (err) {
            cb(null, {
               err: err.toString(),
               solution: null,
            })  
         } else {
            cb(null, {
               err: null,
               solution: solution,
            })
         }
      })
   })

   module.exports = function (options) {
      return new gsearch(options)
   }


})(module, require)