/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /annonces              ->  index
 * POST    /annonces              ->  create
 * GET     /annonces/:id          ->  show
 * PUT     /annonces/:id          ->  update
 * DELETE  /annonces/:id          ->  destroy
 */

'use strict'

const _ = require('lodash')
const Article = require('../models/articles')
const Session = require('./sessions')
const request = require('request')

const getSession = (callback) => {
    var options = {
        uri : 'http://localhost:3000/api/users',
        method : 'GET'
    }
    request(options, function (error, user, body) {
        return callback(JSON.parse(body));
    });
}

// Get list of articles
exports.list = (req, res) => {
  getSession( (response) => {
      const query = Article.find({})
    // execute the query at a later time
    query.exec(function (err, articles) {
      if(err) return res.json({ error: err, success: false, articles: null})
      return res.json({ error: err, success: true, articles: articles, user: response.user})
    })
  })
}

// Get a single article
exports.show = (req, res) => {
  getSession( (response) => {
    console.log("SHOW")
    Article.findById(req.params.id, (err, article) => {
      if(err) { return handleError(res, err) }
      if(!article) { return res.status(500).send('Not Found') }
      return res.json({ error: err, success: true, article: article, user: response.user})
    })
  })
}

exports.load = function(id, callback) {

  Article.findById(id, (err, article) => {
    return callback(err, article)
  })
}

// Creates a new article in the DB.
exports.create = (req, res) => {
  getSession( (response) => {
    if(!req.body && !req.query) return res.status(500).send("DATA NOT FOUND")
    const options = {} // Parse req body in option

    const newArticle = new Article(req.body || req.query)
    Article.findOne({ reference: req.body ? req.body.reference : req.query.reference })
      .exec(function (err, article) {
        if(article) return res.status(500).send("Article déjà existant")

        newArticle.save(function(err, article) {

          return res.status(200).json(article)
        })
    })
  })
}

// Updates an existing article in the DB.
exports.update = (req, res) => {
  if(!req.body && !req.query) return res.status(500).send("DATA NOT FOUND")
  if(req.body._id || req.query._id) { delete req.body ? req.body._id : req.query._id }

  Article.findById(req.params.id, (err, article) => {
    if (err) { return handleError(res, err) }
    if(!article) { return res.status(500).send('Not Found') }
    const updated = _.merge(article, req.body || req.query)

    updated.save( (err) => {
      if (err) { return handleError(res, err) }
      return res.status(200).json(article)
    })
  })
}

// Deletes a article from the DB.
exports.destroy = (req, res) => {

  Article.findById(req.params.id, (err, article) => {
    if(err || !article) { return res.json({ error: err, success: false}) }

    Article.remove(function(err) {
      if(err) { return res.json({ error: err, success: false}) }

      return res.json({ error: null, success: true})
    })
  })
}

const handleError = (res, err) => {
  return res.status(500).send(err)
}
