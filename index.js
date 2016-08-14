(function (module, require) {
   // for making sync APIs
   var deasync = require("deasync")
   // if jar is true, the request handle would remember cookies for future use
   var session = require("request").defaults({jar: true})
   // For parsing html, not a memory leaker like cheerio
   var whacko = require("whacko")
   var URL = require("url")

   // Method for making sync http request to simplyfy the api
   var get = deasync(function (options, cb) {
      options.headers = {
         "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36"
      }
      session.get(options, function (err, resp) {
         if (resp.statusCode === 302) {
            var pathName = URL.parse(resp.headers.location, true)
            // Checking if google redirected to captcha page
            if (pathName !== "/search") {
               var captchaPage = get({
                  uri: resp.headers.location,
                  followRedirect: false
               })
               captchaPage.resp.statusCode = 302
               cb(null, captchaPage)
            // First google search url will always redirect, so
            // following the redirection manually.
            } else {
               var redirectedResp = get({
                  uri: resp.headers.location,
                  followRedirect: false
               })
               cb(null, redirectedResp)
            }
         } else if ((err || resp.statusCode !== 200)) {
            cb(null, {
               err: resp.statusCode + " - " + resp.statusText
            })
         } else {
            cb(null, {
               err: null,
               resp: resp,
               parsed: whacko.load(resp.body)
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
         uri: self.host + "/search",
         qs: self.params,
         followRedirect: false
      })

      // 302 means captcha case
      if (firstResp.resp.statusCode === 302) {
         console.log("Captcha Case")
         var solvedResp = self.solveCaptcha(firstResp)
         cb(null, solvedResp)
         return
      }
      cb(null, firstResp)      
   }

   // Sync function
   gsearch.prototype.getSync = deasync(gsearch.prototype.get)

   gsearch.prototype.solveCaptcha = function (googleCaptchaResp) {
      var self = this

      var $ = googleCaptchaResp.parsed
      var captchaId = $('input[name=id]').attr('value');
      var continueUrl = $('input[name=continue]').attr('value')
      var formAction = $('form').attr('action')
      var imgURL = $('img').attr('src')
      console.log("captchaId :-",captchaId, "\ncontinueUrl:-", continueUrl, "\nformAction:-", formAction, "\nimgURL:-", imgURL)

      // Getting captcha image
      var imgResp = get({
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

   module.exports = gsearch

})(module, require)