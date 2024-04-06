const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const dbpath = path.join(__dirname, 'covid19India.db')
const app = express()
app.use(express.json())

let db = null

const initilizeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('server running at http://localhost/3000')
    })
  } catch (e) {
    console.log(`DB Error:${e.message}`)
  }
}

initilizeDbAndServer()

const convertingDbObject = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  }
}

const convertingDbObjectForDistricts = dbObject => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  }
}

app.get('/states/', async (request, response) => {
  const stateslist = `
        SELECT
            *
        FROM
            state
        ORDER BY
            state_id;
    
    `
  const stateArray = await db.all(stateslist)
  response.send(stateArray.map(eachArray => convertingDbObject(eachArray)))
})

app.get('/states/:stateId', async (request, response) => {
  const {stateId} = request.params
  const stateDetail = `
    SELECT
        *
    FROM 
        state
    WHERE
        state_id=${stateId};


    `

  const state = await db.get(stateDetail)
  response.send(convertingDbObject(state))
})

app.post('/districts/', async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const addDetails = `
  INSERT INTO
    district(district_name,state_id,cases,cured,active,deaths)
  VALUES
    ("${districtName}",${stateId},${cases},${cured},${active},${deaths});
  
  `

  const details = await db.run(addDetails)
  response.send('District Successfully Added')
})

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const districtDetails = `
  SELECT
    *
  FROM
    district
  WHERE
    district_id=${districtId}

    
  
  `
  const district = await db.get(districtDetails)
  response.send(convertingDbObjectForDistricts(district))
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deletedistrict = `
  DELETE FROM 
    district
  WHERE
    district_id=${districtId}
  
  `
  await db.run(deletedistrict)
  response.send('District Removed')
})

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const updateDetails = `
  UPDATE
    district
  SET
    district_name="${districtName}",

    state_id=${stateId},
    cases=${cases},
    cured=${cured},
    active=${active};
    deaths=${deaths}
  WHERE
    district_id=${districtId}
  
  
  `
  await db.run(updateDetails)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getstats = `
  SELECT
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
  FROM
    district
  WHERE
    state_id=${stateId};
  
  `

  const stats = await db.get(getstats)

  response.send({
    totalCases: stats['SUM(cases)'],
    totalCured: stats['SUM(cured)'],
    totalActive: stats['SUM(active)'],
    totalDeaths: stats['SUM(deaths)'],
  })
})

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getdistrict = `
  SELECT 
    state_id 
  FROM 
    district
  WHERE 
    district_id=${districtId};
  `
  const districtresponse = await db.get(getdistrict)

  const getstateName = `
  SELECT
   state_name as stateName
  FROM
   state
  WHERE
   state_id=${districtresponse.state_id}
  
  `
  const getstate = await db.get(getstateName)
  response.send(getstate)
})

module.exports = app
