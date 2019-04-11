'use strict'

const User = require('../models/users')
const Article = require('../models/articles')
const passport = require('passport')
const bcrypt = require('bcrypt')
const async = require('async')
const ObjectId = require('mongodb').ObjectID

const validationError = (res, err) => {
  return res.status(422).json(err)
}

exports.getUserConnect = (req, res) => {
  User.findOne({ is_login: true })
    .exec((err, user) => {
      if(!user) return res.json({error: "Aucun compte connecté", success: false})

      return res.json({error: err, success: user ? true : false, user: user })
  })
}

exports.show = (req, res) => {
  console.log("SHOW")
  User.findById(req.params.id, (err, user) => {
    if(err) { return handleError(res, err) }
    if(!user) { return res.status(500).send('Not Found') }
    return res.json({ error: err, success: true, user: user})
  })
}

/**
 * Get list of users
 * restriction: 'admin'
 */
exports.index = function(req, res) {
  User.find({}, '-salt -hashedPassword', function (err, users) {
    if(err) return res.status(500).send(err)
    res.status(200).json(users[0])
  })
}

/**
 * Creates a new user
 */

exports.create = (req, res) => {
  if(!req.body && !req.query) return res.status(500).send("DATA NOT FOUND")

  const body = req.body ? req.body : req.query

  const options = {
    email: body.email,
    name: {
      firstname: body.firstname,
      lastname: body.lastname
    },
    address: {
      address: body.address,
      code_postal: body.code_postal,
      city: body.city
    },
    password: body.password
  }

  const newUser = new User(options)

  User.findOne({ email: body.email })
    .exec((err, user) => {
      if(user) return res.json({error: "Compte déjà existant", success: false})

      newUser.save((err, user) => {

        return res.json({error: err, success: user ? true : false, user: user })
      })
  })
}

exports.edit = (req, res) => {
  if(!req.session || (req.session && !req.session.user && !req.session.user._id) || (req.session && req.session.user && !req.session.user._id)) return res.json({error: "NOT ID", success: false})
  if(!req.body && !req.query) return res.status(500).send("DATA NOT FOUND")

  User.findById(req.session.user._id, (err, user) => {
    if (err || !user) return callback(err, null)
    const options = req.body ? req.body : req.query

    if(options.firstname) user.name.firstname = options.firstname
    if(options.lastname) user.name.lastname = options.lastname
    if(options.address) user.address.address = options.address
    if(options.code_postal) user.address.code_postal = options.code_postal
    if(options.country) user.address.country = options.country
    if(options.city) user.address.city = options.city
    user.was_new = true

    user.save((err, user) => {

      return res.json({error: err, success: user ? true : false, user: user })
    })
  })
}


exports.addArticle = (user, article, callback) => {
  const userId = user._id
  const articleId = article._id

  if(!article) return callback("Aucun article sélectionné", null)
  User.findOne({ _id: userId })
    .exec((err, user) => {
    if (err || !user) return callback(err, null)

    user.articles.push(articleId)
    user.was_new = true
    user.save((err, user) => {

      Article.findOne({ _id: articleId })
        .exec((err, article_founded) => {

          article_founded['Receiver'] = userId
          article_founded.save((err, article) => {

            return callback(err, user)
          })
        })
    })
  })
}

exports.removeArticle = (user , article, callback) => {
  const userId = user._id
  const articleId = article._id

  if(!article || !articleId ) return callback("Pas d'article sélectionnés", null)

  User.findById(userId, (err, user) => {
    if (err || !user) return callback(err, null)
    const articles = []

    async.parallel({
      removeArticle: (cbk_parallel) => {

        async.each(user.articles, (article_id, cbk) => {
          if( String(articleId) != String(article_id)) articles.push(article_id)

          cbk()
        }, (err) =>{

          cbk_parallel()
        })
      }
    }, (err) =>{

      user.articles =  articles
      user.was_new = true

      user.save((err, user) => {

        Article.findOne({ _id: articleId })
          .exec((err, article_founded) => {

            article_founded['Receiver'] = null
            article_founded.save((err, article) => {

              return callback(err, user)
            })
          })
      })
    })
  })
}

exports.authenticateSaveUser = (body, callback) => {
  User.findOne({ email: body.email })
    .exec((err, user) => {
      if (err) {
        return callback(err)
      } else if (!user) {
        const err = new Error('User not found.')
        err.status = 401
        return callback(err)
      }

      user['is_login'] = true;
      const newUser = new User(user)

      newUser.save((err, user_save) => {
        return callback(null, user_save)

        bcrypt.compare(body.password, user.password, (err, result) => {

          if (result === true) {
            return callback(null, user)
          } else {
            return callback()
          }
        })
      })
    })
}

exports.authenticate = (body, callback) => {
  User.findOne({ email: body.email })
    .exec((err, user) => {
      if (err) {
        return callback(err)
      } else if (!user) {
        const err = new Error('User not found.')
        err.status = 401
        return callback(err)
      }

      return callback(null, user)

      bcrypt.compare(body.password, user.password, (err, result) => {

        if (result === true) {
          return callback(null, user)
        } else {
          return callback()
        }
      })
  })
}

/**
 * Get a single user
 */
exports.show = (req, res, next) => {
  const userId = req.params.id

  User.findById(userId, (err, user) => {
    if (err) return next(err)
    if (!user) return res.status(401).send('Unauthorized')
    res.json(user.profile)
  })
}

/**
 * Deletes a user
 * restriction: 'admin'
 */
exports.destroy = (req, res) => {
  User.findByIdAndRemove(req.params.id, (err, user) => {
    if(err) return res.status(500).send(err)
    return res.status(204).send('No Content')
  })
}

/**
 * Change a users password
 */
exports.changePassword = (req, res, next) => {
  const userId = req.session.user._id
  const oldPass = String(req.body.old_password)
  const newPass = String(req.body.new_password)

  User.findById(userId, (err, user) => {
    bcrypt.compare(oldPass, user.password, function (err, result) {
     if(!result) return res.json({error: "Mauvais mot de passe", success: false })

     user.password = newPass
     user.was_new = false

     user.save((err) => {
       if (err) return res.json({error: err, success: false})

       res.json({error: null, success: true })
     })
   })
  })
}

/**
 * Get my info
 */
exports.me = function(req, res, next) {
  const userId = req.user._id
  User.findOne({
    _id: userId
  }, '-salt -hashedPassword', (err, user) => { // don't ever give out the password or salt
    if (err) return next(err)
    if (!user) return res.status(401).send('Unauthorized')
    res.json(user)
  })
}

exports.load = (user, callback) => {

  User.findOne({ email: user.email }, (err, user) => {

    callback(err, user)
  })
}
/**
 * Authentication callback
 */
exports.authCallback = (req, res, next) => {
  res.redirect('/')
}
