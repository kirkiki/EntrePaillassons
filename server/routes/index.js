const router = require('express').Router()

router.get('/', function(req, res) {
  res.status(200).json(' Bienvenue dans notre API : /api/annonces , /api/users')
})

router.post('/', function(req, res) {
  res.status(200).json(' Bienvenue dans notre API : /api/annonces , /api/users')
})

module.exports = router;
