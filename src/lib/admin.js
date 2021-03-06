/*
  A library for working with the system admin user. This is an auto-generated
  account with 'admin' privledges, for interacting with private APIs.

  The admin account is regenerated every time the server is started. This improves
  security by not having stale passwords for the account. The login information
  and JWT token for the admin account is written to a JSON file, for easy
  retrieval by other apps running on the server that may need admin privledges
  to access private APIs.
*/

'use strict'
const axios = require('axios').default
const mongoose = require('mongoose')
const User = require('../models/users')
const jsonFiles = require('./utils/json-files')
const config = require('../../config')

const JSON_FILE = `system-user-${config.env}.json`
const JSON_PATH = `${__dirname}/../../config/${JSON_FILE}`

const LOCALHOST = `http://localhost:${config.port}`
const context = {}

// Create the first user in the system. A 'admin' level system user that is
// used by the Listing Manager and test scripts, in order access private API
// functions.
async function createSystemUser () {
  // Create the system user.
  try {
    context.password = _randomString(20)

    const options = {
      method: 'POST',
      url: `${LOCALHOST}/users`,
      data: {
        user: {
          email: 'system@system.com',
          password: context.password
        }
      }
    }
    let result = await axios(options)

    context.email = result.data.user.email
    context.id = result.data.user._id
    context.token = result.data.token

    // Get the mongoDB entry
    const user = await User.findById(context.id)

    // Change the user type to admin
    user.type = 'admin'
    // console.log(`user: ${JSON.stringify(user, null, 2)}`)

    // Save the user model.
    await user.save()

    // console.log(`admin user created: ${JSON.stringify(result.body, null, 2)}`)
    // console.log(`with password: ${context.password}`)

    // Write out the system user information to a JSON file that external
    // applications like the Task Manager and the test scripts can access.
    await jsonFiles.writeJSON(context, JSON_PATH)

    return context
  } catch (err) {
    // Handle existing system user.
    if (err.response.status === 422) {
      try {
        // Delete the existing user
        await deleteExistingSystemUser()

        // Call this function again.
        return createSystemUser()
      } catch (err2) {
        console.error(`Error in admin.js/createSystemUser() while trying generate new system user.`)
        // process.end(1)
        throw err2
      }
    } else {
      console.log('Error in admin.js/createSystemUser: ' + JSON.stringify(err, null, 2))
      // process.end(1)
      throw err
    }
  }
}

async function deleteExistingSystemUser () {
  try {
    mongoose.Promise = global.Promise
    mongoose.set('useCreateIndex', true) // Stop deprecation warning.

    await mongoose.connect(config.database, { useNewUrlParser: true, useUnifiedTopology: true })

    await User.deleteOne({ email: 'system@system.com' })
  } catch (err) {
    console.log(`Error in admin.js/deleteExistingSystemUser()`)
    throw err
  }
}

async function loginAdmin () {
  // console.log(`loginAdmin() running.`)
  let existingUser

  try {
    // Read the exising file
    existingUser = await jsonFiles.readJSON(JSON_PATH)
    // console.log(`existingUser: ${JSON.stringify(existingUser, null, 2)}`)

    // Log in as the user.
    let options = {
      method: 'POST',
      url: `${LOCALHOST}/auth`,
      data: {
        email: 'system@system.com',
        password: existingUser.password
      }
    }
    let result = await axios(options)
    // console.log(`result1: ${JSON.stringify(result, null, 2)}`)

    return result
  } catch (err) {
    console.error(`Error in admin.js/loginAdmin().`)

    // console.error(`existingUser: ${JSON.stringify(existingUser, null, 2)}`)

    throw err
  }
}

function _randomString (length) {
  var text = ''
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

module.exports = {
  createSystemUser,
  loginAdmin
}
