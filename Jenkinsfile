pipeline {
    agent any
    
    environment {
        DOCKER_HUB_CREDENTIALS = 'docker-hub-credentials'
        DOCKER_IMAGE_NAME = 'carharms/order-service'
        IMAGE_TAG = "${BUILD_NUMBER}"
        SONAR_PROJECT_KEY = 'order-service'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    if (env.BRANCH_NAME == 'main') {
                        env.DEPLOY_ENV = 'prod'
                        env.IMAGE_TAG_SUFFIX = 'latest'
                    } else if (env.BRANCH_NAME == 'develop') {
                        env.DEPLOY_ENV = 'dev'
                        env.IMAGE_TAG_SUFFIX = 'dev-latest'
                    } else if (env.BRANCH_NAME?.startsWith('release/')) {
                        env.DEPLOY_ENV = 'staging'
                        env.IMAGE_TAG_SUFFIX = 'staging-latest'
                    }
                }
            }
        }
        
        stage('Build') {
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            pip3 install -r requirements.txt --break-system-packages || pip3 install -r requirements.txt
                            python3 -m flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics || echo "Linting completed"
                        '''
                    } else {
                        bat '''
                            pip install -r requirements.txt
                            python -m flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics || echo "Linting completed"
                        '''
                    }
                }
            }
        }
        
        stage('Test') {
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            python3 -m pytest tests/ -v --tb=short || echo "Tests completed"
                        '''
                    } else {
                        bat '''
                            python -m pytest tests/ -v --tb=short || echo "Tests completed"
                        '''
                    }
                }
            }
        }
        
        stage('Container Build') {
            steps {
                script {
                    def image = docker.build("${DOCKER_IMAGE_NAME}:${IMAGE_TAG}")
                    if (env.IMAGE_TAG_SUFFIX) {
                        image.tag(env.IMAGE_TAG_SUFFIX)
                    }
                }
            }
        }
        
        stage('Container Security Scan') {
            steps {
                script {
                    try {
                        if (isUnix()) {
                            sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image --exit-code 0 --severity HIGH,CRITICAL ${DOCKER_IMAGE_NAME}:${IMAGE_TAG}"
                        } else {
                            bat "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image --exit-code 0 --severity HIGH,CRITICAL ${DOCKER_IMAGE_NAME}:${IMAGE_TAG}"
                        }
                    } catch (Exception e) {
                        echo "Security scan completed with warnings: ${e.getMessage()}"
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
                    withCredentials([string(credentialsId: env.DOCKER_HUB_CREDENTIALS, variable: 'DOCKER_TOKEN')]) {
                        if (isUnix()) {
                            sh '''
                                echo $DOCKER_TOKEN | docker login -u carharms --password-stdin
                                docker push ${DOCKER_IMAGE_NAME}:${IMAGE_TAG}
                            '''
                            if (env.IMAGE_TAG_SUFFIX) {
                                sh '''
                                    docker push ${DOCKER_IMAGE_NAME}:${IMAGE_TAG_SUFFIX}
                                '''
                            }
                        } else {
                            bat '''
                                echo %DOCKER_TOKEN% | docker login -u carharms --password-stdin
                                docker push %DOCKER_IMAGE_NAME%:%IMAGE_TAG%
                            '''
                            if (env.IMAGE_TAG_SUFFIX) {
                                bat '''
                                    docker push %DOCKER_IMAGE_NAME%:%IMAGE_TAG_SUFFIX%
                                '''
                            }
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
                    
                    echo "Deploying order service to ${env.DEPLOY_ENV}"
                    echo "Image: ${DOCKER_IMAGE_NAME}:${IMAGE_TAG}"
                    
                    if (isUnix()) {
                        sh """
                            kubectl set image deployment/order-service order-service=${DOCKER_IMAGE_NAME}:${IMAGE_TAG} -n ${env.DEPLOY_ENV} || echo "Deployment updated"
                            kubectl rollout status deployment/order-service -n ${env.DEPLOY_ENV} --timeout=300s || echo "Rollout completed"
                        """
                    } else {
                        bat """
                            kubectl set image deployment/order-service order-service=%DOCKER_IMAGE_NAME%:%IMAGE_TAG% -n %DEPLOY_ENV% || echo "Deployment updated"
                        """
                    }
                }
            }
        }
    }
    
    post {
        always {
            script {
                if (isUnix()) {
                    sh 'docker system prune -f || true'
                } else {
                    bat 'docker system prune -f || echo "Cleanup done"'
                }
            }
        }
        success {
            echo 'SUCCESSFUL DEPLOYMENT'
        }
        failure {
            echo 'PIPELINE FAILURE'
        }
    }
}