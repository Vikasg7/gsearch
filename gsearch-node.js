(function (module, require) {
   var decache = require("decache")
   // for making sync APIs
   var deasync = require("deasync")
   // if jar is true, the request handle would remember cookies for future use
   var session = require("request").defaults({jar: true})
   // For parsing html, not a memory leaker like cheerio
   var whacko = require("whacko")
   // URL parser
   var URL = require("url")

   // Method for making sync http request to simplyfy the api
   var get = deasync(function (options, cb) {
      options.headers = {
         "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36"
      }
      session.get(options, function (err, resp) {
         if (err) {
            cb(null, {
               err: err.code
            })
         } else if (resp.statusCode !== 200 && resp.statusCode !== 503) {
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
      self.params = options.params || {}
      self.host = options.host || "https://www.google.com"
   }
   
   gsearch.prototype.get = function (searchString, cb) {
      var self = this

      self.params.q = searchString
      self.params.oq = searchString
      
      // Requesting page
      var firstResp = get({
         uri: self.host + "/search",
         qs: self.params
      })

      var $ = firstResp.parsed
      if ($("noscript").length === 0) {
         // decaching request module
         decache("request")
         // getting a new request handle
         session = require("request")
         firstResp = get({
            uri: self.host + "/search",
            qs: self.params
         })
         // This is important line of code. that is - to remember cookies after
         // first captcha response (containing noscript element). It also reduces 
         // no. of captchas used.
         session = session.defaults({jar: true})
      }

      // 503 means captcha case
      if (firstResp.resp.statusCode === 503 && 
          firstResp.resp.request.uri.href.search("/sorry")) {
         // require("fs").writeFileSync("./temp.html", firstResp.resp.body, "utf-8")
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

      // for second type of google captcha 
      var $$ = whacko.load($("noscript").text())
      // taking care of both type of captcha throw systems by google.
      var imgSrc = $("img").attr("src") || $$("img").attr("src")
      
      var q = $('input[name=q]').attr('value')
      var captchaId = imgSrc.match(/\?id=(.*?)\&/)[1]
      var continueUrl = $('input[name=continue]').attr('value')
      var formAction = $('form').attr('action')
      var imgURL = URL.resolve("https://ipv4.google.com", imgSrc)

      // Getting captcha image
      var imgResp = get({
         url: imgURL,
         encoding: null
      })
      if (imgResp.err) { return imgResp }

      // Solving captcha
      var captchaResp = self.getCaptchaSolvedSync(imgResp.resp.body)
      if (captchaResp.err) { return captchaResp }

      // Trying solution
      var secondResp = get({
         uri: self.host + "/sorry/" + formAction,
         qs: {
            q: q,
            id: captchaId,
            captcha: captchaResp.solution,
            continue: continueUrl
         }
      })

      return secondResp
   }

   gsearch.prototype.getCaptchaSolved = function (img, cb) {
      var self = this
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
   }

   gsearch.prototype.getCaptchaSolvedSync = deasync(gsearch.prototype.getCaptchaSolved)

   module.exports = gsearch

})(module, require)