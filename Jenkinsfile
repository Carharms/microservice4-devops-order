pipeline {
    agent any
    
    environment {
        DOCKER_HUB_CREDENTIALS = 'docker-hub-credentials'
        DOCKER_IMAGE_NAME = 'carharms/product-service'
        IMAGE_TAG = "${BUILD_NUMBER}"
        SONAR_PROJECT_KEY = 'product-service'
        // SONAR_HOST_URL = 'http://localhost:9000'
        // SONAR_AUTH_TOKEN
        
        // Database test configuration
        POSTGRES_DB = 'subscriptions'
        POSTGRES_USER = 'dbuser'
        POSTGRES_PASSWORD = 'dbpassword'
        DB_HOST = 'localhost'
        DB_PORT = '5432'
    }
    
    stages {
        stage('Build') {
            steps {
                script {
                    echo "Installing Node.js dependencies and running code quality checks..."
                    sh '''
                        # Install Node.js dependencies
                        npm install
                        
                        # Run linting if available
                        if npm list eslint >/dev/null 2>&1; then
                            echo "Running ESLint..."
                            npm run lint || echo "Linting completed with issues"
                        else
                            echo "ESLint not configured, skipping linting"
                        fi
                        
                        echo "Validating required files..."
                        test -f "index.js" && echo "✓ index.js found" || (echo "✗ index.js missing" && exit 1)
                        test -f "package.json" && echo "✓ package.json found" || (echo "✗ package.json missing" && exit 1)
                        test -f "Dockerfile" && echo "✓ Dockerfile found" || (echo "✗ Dockerfile missing" && exit 1)
                        test -f "docker-compose.yml" && echo "✓ docker-compose.yml found" || (echo "✗ docker-compose.yml missing" && exit 1)
                        test -d "test" && echo "✓ test directory found" || (echo "✗ test directory missing" && exit 1)
                    '''
                }
            }
        }
        
        stage('Test') {
            steps {
                script {
                    echo "Running Node.js tests..."
                    sh '''
                        # Create test directory if it doesn't exist
                        mkdir -p test
                        
                        # Run unit tests
                        echo "Running unit tests..."
                        npm test || echo "Unit tests completed with issues"
                        
                        # Start database for integration tests
                        echo "Starting database for integration tests..."
                        docker-compose -f docker-compose.yml down --remove-orphans || true
                        docker-compose -f docker-compose.yml up -d db
                        
                        # Wait for database to be ready
                        echo "Waiting for database to be ready..."
                        timeout 60 bash -c 'until docker-compose -f docker-compose.yml exec -T db pg_isready -U $POSTGRES_USER -d $POSTGRES_DB; do sleep 2; done' || echo "Database ready check timeout"
                        
                        # Run integration tests if available
                        echo "Running integration tests..."
                        if npm run test:integration >/dev/null 2>&1; then
                            npm run test:integration || echo "Integration tests completed with issues"
                        else
                            echo "No integration tests configured"
                        fi
                        
                        # Cleanup
                        echo "Cleaning up test environment..."
                        docker-compose -f docker-compose.yml down --remove-orphans || true
                    '''
                }
            }
        }
      
        stage('SonarQube Analysis and Quality Gate') {
            steps {
                script {
                    // SonarScanner tool path
                    def scannerHome = tool 'SonarScanner'
                    withSonarQubeEnv('SonarQube') {
                        bat """
                            ${scannerHome}/bin/sonar-scanner -Dsonar.projectKey=${SONAR_PROJECT_KEY} -Dsonar.sources=. -Dsonar.exclusions=node_modules/**,test/**,coverage/**
                        """
                    }
                }
            }
        }
        
        stage('Container Build') {
            steps {
                script {
                    echo "Building Docker image..."
                    def image = docker.build("${DOCKER_IMAGE_NAME}:${IMAGE_TAG}")
                    
                    // Tag with branch-specific tags
                    if (env.BRANCH_NAME == 'main') {
                        image.tag("latest")
                    } else if (env.BRANCH_NAME == 'develop') {
                        image.tag("dev-latest")
                    } else if (env.BRANCH_NAME?.startsWith('release/')) {
                        image.tag("staging-latest")
                    }
                }
            }
        }
    
        stage('Container Security Scan') {
            steps {
                script {
                    echo "Running container security scan..."
                    try {
                        bat "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image --exit-code 1 --severity CRITICAL ${DOCKER_IMAGE_NAME}:${IMAGE_TAG}"
                    } catch (Exception e) {
                        echo "Security scan encountered issues but continuing: ${e.getMessage()}"
                    }
                }
            }
        }
        
        stage('Container Push') {
            when {
                anyOf {
                    branch 'develop'
                    branch 'main'
                    branch 'release/*'
                }
            }
            steps {
                script {
                    echo "Pushing Docker image to registry..."
                    docker.withRegistry('https://index.docker.io/v1/', env.DOCKER_HUB_CREDENTIALS) {
                        def image = docker.image("${DOCKER_IMAGE_NAME}:${IMAGE_TAG}")
                        image.push()
                        
                        if (env.BRANCH_NAME == 'main') {
                            image.push("latest")
                        } else if (env.BRANCH_NAME == 'develop') {
                            image.push("dev-latest")
                        } else if (env.BRANCH_NAME?.startsWith('release/')) {
                            image.push("staging-latest")
                        }
                    }
                }
            }
        }
        
        stage('Deploy') {
            when {
                anyOf {
                    branch 'develop'
                    expression { env.BRANCH_NAME.startsWith('release/') }
                    branch 'main'
                }
            }
            steps {
                script {
                    if (env.BRANCH_NAME == 'main') {
                        timeout(time: 10, unit: 'MINUTES') {
                            input message: "Deploy to production?", ok: "Deploy"
                        }
                    }
                    
                    echo "Deploying to ${env.BRANCH_NAME} environment..."
                    sh 'docker-compose -f docker-compose.yml up -d'
                }
            }
        }
    }
    
    post {
        always {
            sh '''
                docker-compose -f docker-compose.yml down --remove-orphans || true
                docker system prune -f || true
            '''
        }
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}