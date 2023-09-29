
## Installation

```bash
$ yarn install
```

## Running the app

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```
```
## Description

You can get repositorues by query 

  repositories(token: "your token") {
    name
  	size
  	owner
  }

you can get full repo by query

  fullRepository(token: "your token", owner: "owner", repo: "repo") {
    name
  	size
  	owner
    activeWebhooks {
      name
      id
    }
    ymlFileContent
  }

OR as relation

   repositories(token: "your token") {
    name
  	size
  	owner
  	fullRepo(token: "your token") {
      name
      size
      owner
      activeWebhooks {
        name
        id
      }
      ymlFileContent
  	}
  }


