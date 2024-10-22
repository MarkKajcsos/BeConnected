

## Overview
This document serves as a side note for the reviewer, highlighting tasks where I encountered challenges or have specific observations.

## Frontend

#### Dessert: Dual camera photo
I was unable to test this feature on my phone. When I pressed the Shoot button, a browser window popped up on my MacBook :D I'm not sure what happened, as I am still getting accustomed to the macOS and iOS environments.


## DevOps

#### Main: Prod deploy
Deploying is done on merging into *main* branch, but triggering the app (by sending ___capture now___ command from *Apex Homework - Mark.Kajcsos-Admin*) doesn't work. While the created ___/slack/capture-now___ API is being called, the MessageBus event is not being raised, which prevents the next Lambda function from executing.

#### Dessert: Feature preview deploy - Optional task
I attempted a different approach than what was prepared in the script files. However, I encountered syntax issues in the GitHub action files. Regardless, I plan to implement a solution using the prepared scripts, as I cannot leave the current state unresolved even after your review.


## System Design

#### Main: Repository feedback
See [repository feedback.md](./Rerpository%20feedback.md) file for detailed feedback regarding the repository structure and practices.

#### Dessert: Automated testing
My test suggestions can be found in the [repository feedback.md](./Rerpository%20feedback.md) file.
