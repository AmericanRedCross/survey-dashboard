survey dashboard
================

We've used ODK to collect all these geo-tagged surveys, let's look at it on a map.

- clone repository
- edit userauth.js.example  
- save as userauth.js
- create 'secure/data' folder then add data and analysis files
- adjust port as desired in 'settings/settins.js'
- install dependencies and start node app:
```shell
  cd ~/survey-dashboard/secure
  bower install
  cd ../
  npm install
  pm2 start survey-dashboard.js
```
- Open up a browser and go to: [http://localhost:3009](http://localhost:3009) or set port


**Technology Used:**
- [D3.js](http://d3js.org/)
- [Bootstrap](http://getbootstrap.com/)
- [jQuery](https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js)
- [Leaflet.js](http://leafletjs.com/)
- [Leaflet.heat](https://github.com/Leaflet/Leaflet.heat)
- [Spectrum colorpicker](https://github.com/bgrins/spectrum)
