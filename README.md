# Mines Nantes' scientific publications visualisation project

## Aim
The aim of this project is to provide an exploration tool on the scientific publications
of the Mines Nantes.  
This is a school project of ordered by Mines Nantes

## Disclaimer
The tool has only being tested on chrome 48.0.2564.103 for linux.  
The resolution being fixed, you could need to unzoom to see it properly.

## Pre-requisite
In order to visualise this tool, you will need to use a web server as your browser is not allowed to load files from your computer.
A good way to set one up, is to have Python installed.

## Methodology
To produce this exploration tool, the following steps have been followed:
  1. Get all the publications from Mines Nantes, and store their title and abstract.
  2. Group publications by 5 five years.
  3. Produce a graph network with Tropes (Export GEXF) for each publication grouping (co-occurences).
  4. Analyse the graph networks with Gephi and determine clusters
  5. Develop a ReactJS-SigmaJS visualisation

## Organisation of the project
In this repo you will find 4 folders:
  - `data`: this contains all the data needed to the viz.
    + `exportOAIPMH` folder: all the OAIPMH exports from HAL.
    + `builtData` folder: all the formated data and Tropes exports

  - `gephi`: all the gephi project files

  - `scripts`: all the scripts to format the data

  - `visualisation`: all the files to run the visualisation

## Installation and visualisation
  1. Git-clone this repository
  2. Go to the folder `visualisation`
  3. In your favorite terminal run `npm install`
  4. In your favorite terminal run `python -m SimpleHTTPServer 8000`
  5. In Chrome (other browser not guaranteed), go to `localhost:8000`

## Modification
Want to modify the visualisation?
  1. Go to the `visualisation` folder
  2. Edit the `script.js` file
  3. In your favorite terminal, run `npm run bundle`
a
