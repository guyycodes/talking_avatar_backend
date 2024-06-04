var express = require('express');
var router = express.Router();
var textToSpeech = require('../helpers/textToSpeach');

/* GET home page. */
router.post('/talk', function(req, res, next) {

  textToSpeech(req.body.text, req.body.voice)
  .then(result => {
    res.json(result);    
  })
  .catch(err => {
    res.json({});
  });

  {
    "Effect": "Allow",
    "Action": "iam:ListAttachedGroupPolicies",
    "Resource": "arn:aws:iam::590183987690:group/TheTalkingToasterGroup"
  }
});

module.exports = router;
