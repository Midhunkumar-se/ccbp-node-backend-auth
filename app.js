const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')

const app = express()
app.use(express.json())
const dbPath = path.join(__dirname, 'userData.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()

app.post('/register/', async (request, response) => {
  const {username, name, password, gender, location} = request.body

  if (password.length < 5) {
    response.status(400).send('Password is too short')
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const getBooksQuery = `SELECT * FROM user WHERE username = "${username}"`
  const dbUser = await db.get(getBooksQuery)

  if (dbUser === undefined) {
    const createUserQuery = `
    INSERT INTO user (username, name, password, gender, location) VALUES ("${username}", "${name}","${hashedPassword}", "${gender}", "${location}");
  `
    await db.run(createUserQuery)
    response.send('User created successfully')
  } else {
    response.status(400).send('User already exists')
  }
})

app.post('/login/', async (request, response) => {
  const {username, password} = request.body

  const selectUserQuery = `SELECT * FROM user WHERE username = "${username}"`
  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    response.status(400).send('Invalid User')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)

    if (isPasswordMatched === true) {
      response.send('Login Success')
    } else {
      response.status(400).send('Invalid Password')
    }
  }
})

app.put('/change-password/', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  const getBooksQuery = `SELECT * FROM user WHERE username = "${username}"`
  const dbUser = await db.get(getBooksQuery)
  const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password)

  if (isPasswordMatched === true) {
    if (newPassword.length < 5) {
      response.status(400).send('Password is too short')
    } else {
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      const createUserQuery = `
      UPDATE user SET password = "${hashedPassword}" WHERE username = "${username}"
    `
      await db.run(createUserQuery)
      response.send('Password updated')
    }
  } else {
    response.status(400).send('Invalid current password')
  }
})

module.exports = app