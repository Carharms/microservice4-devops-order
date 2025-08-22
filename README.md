## Order Service Overview ##
Repository for the REST API that handles all order management for the e-commerce platform.

## Setup ##
Install locally is with Docker and Docker Compose.

1. Clone this repository:
git clone <your-repo-url>

2. Change to the project directory:
cd order-service

3. Use Docker Compose to build the image and start the service along with its database:
docker-compose up --build

This will make the service available on your local machine at the port specified in the docker-compose.yml file.

## Project Architecture ##
Technology Stack: This is a RESTful API service.

Database: It uses a dedicated PostgreSQL database to store all order-related information, including customer details, order items, and status.

Inter-service Communication: This service depends on the Product Service to retrieve product details and validate stock levels when a new order is created. This communication happens over the internal Kubernetes cluster network in production.

Key Functionality: It exposes endpoints for:

POST /orders: Create a new order.

GET /orders/{id}: Fetch the status of a specific order.

GET /customers/{customerId}/orders: Retrieve all orders for a given customer.

## CI/CD Pipeline ##
A Jenkins pipeline is configured for this repository to provide a fully automated CI/CD workflow:

Build & Test: The pipeline compiles the code and runs a series of unit and integration tests.

Containerization: A Docker image is created from the service's codebase and tagged with a unique version identifier.

Image Push: The Docker image is then pushed to Docker Hub for distribution.

<<<<<<< HEAD
docker run -d --name sonarqube -p 9000:9000 sonarqube:lts
=======
Deployment: The pipeline orchestrates the deployment to the different Kubernetes environments, ensuring a seamless and repeatable process for every code change.
>>>>>>> master
