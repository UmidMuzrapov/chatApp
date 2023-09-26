## Description 
Chat App allows the users to chat after a successful log-in.
Images uplaoded by students are resized and stored in AWS S3. The web app also uses cashing and cookies.

## Configuration 
Build the docker image
```
docker build -t chatApp .
```
Run the container from the chatApp image
```
docker run -it --name chatAppInstance chatApp
```
## To Do List
  - Include the design diagram
  - Improve the README
