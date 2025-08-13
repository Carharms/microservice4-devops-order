@Library('microservices-shared-library') _

pipeline {
    agent any
    
    environment {
        DOCKER_HUB_CREDENTIALS = 'dockerhub-credentials'
        DOCKER_IMAGE_NAME = 'carharms/order-service'
        SONAR_PROJECT_KEY = 'order-service'
        SONAR_HOST_URL = 'http://sonarqube:9000'
        KUBECONFIG = credentials('kubeconfig')
        SERVICE_NAME = 'order-service'
        SERVICE_PORT = '3002'
        NAMESPACE = 'default'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    env.IMAGE_TAG = determineImageTag()
                }
            }
        }
        
        stage('Build') {
            steps {
                script {
                    buildNodeApplication()
                }
            }
        }
        
        stage('Test') {
            steps {
                script {
                    runNodeTests()
                }
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'test-results.xml'
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
            }
        }
        
        stage('Security Scan') {
            parallel {
                stage('SonarQube Analysis') {
                    steps {
                        script {
                            runSonarQubeAnalysis(env.SONAR_PROJECT_KEY, env.SONAR_HOST_URL)
                        }
                    }
                }
                stage('Dependency Check') {
                    steps {
                        script {
                            runDependencyCheck()
                        }
                    }
                }
            }
        }
        
        stage('Quality Gate') {
            steps {
                script {
                    waitForQualityGate()
                }
            }
        }
        
        stage('Container Build') {
            steps {
                script {
                    buildDockerImage(env.DOCKER_IMAGE_NAME, env.IMAGE_TAG)
                }
            }
        }
        
        stage('Container Security Scan') {
            steps {
                script {
                    scanDockerImage(env.DOCKER_IMAGE_NAME, env.IMAGE_TAG)
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
                    pushDockerImage(env.DOCKER_IMAGE_NAME, env.IMAGE_TAG)
                }
            }
        }
        
        stage('Deploy') {
            parallel {
                stage('Deploy to Dev') {
                    when {
                        branch 'develop'
                    }
                    steps {
                        script {
                            deployToKubernetes(
                                imageName: "${env.DOCKER_IMAGE_NAME}:${env.IMAGE_TAG}",
                                serviceName: env.SERVICE_NAME,
                                namespace: 'dev',
                                port: env.SERVICE_PORT,
                                environment: 'dev'
                            )
                        }
                    }
                }
                
                stage('Deploy to Staging') {
                    when {
                        branch 'release/*'
                    }
                    steps {
                        script {
                            deployToKubernetes(
                                imageName: "${env.DOCKER_IMAGE_NAME}:${env.IMAGE_TAG}",
                                serviceName: env.SERVICE_NAME,
                                namespace: 'staging',
                                port: env.SERVICE_PORT,
                                environment: 'staging'
                            )
                        }
                    }
                }
                
                stage('Deploy to Production') {
                    when {
                        branch 'main'
                    }
                    steps {
                        script {
                            input message: 'Deploy to Production?', ok: 'Deploy',
                                  parameters: [
                                      choice(name: 'DEPLOY_CONFIRM', choices: ['No', 'Yes'], description: 'Confirm deployment to production')
                                  ]
                            
                            if (params.DEPLOY_CONFIRM == 'Yes') {
                                deployToKubernetes(
                                    imageName: "${env.DOCKER_IMAGE_NAME}:${env.IMAGE_TAG}",
                                    serviceName: env.SERVICE_NAME,
                                    namespace: 'production',
                                    port: env.SERVICE_PORT,
                                    environment: 'production'
                                )
                            }
                        }
                    }
                }
            }
        }
        
        stage('Post-Deploy Tests') {
            when {
                anyOf {
                    branch 'develop'
                    branch 'release/*'
                    branch 'main'
                }
            }
            steps {
                script {
                    def targetEnv = determineEnvironment()
                    runPostDeploymentTests(targetEnv, env.SERVICE_NAME, env.SERVICE_PORT)
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
            script {
                sendNotifications(currentBuild.result ?: 'SUCCESS')
            }
        }
        failure {
            script {
                if (env.BRANCH_NAME in ['main', 'develop']) {
                    emailext (
                        subject: "Pipeline Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                        body: "Build failed for ${env.SERVICE_NAME}. Check: ${env.BUILD_URL}",
                        to: "${env.TEAM_EMAIL}"
                    )
                }
            }
        }
    }
}

def determineImageTag() {
    switch(env.BRANCH_NAME) {
        case 'main':
            return "v${env.BUILD_NUMBER}"
        case 'develop':
            return "dev-${env.BUILD_NUMBER}"
        case ~/^release\/.*/:
            return "rc-${env.BUILD_NUMBER}"
        default:
            return "pr-${env.BUILD_NUMBER}-${env.GIT_COMMIT_SHORT}"
    }
}

def determineEnvironment() {
    switch(env.BRANCH_NAME) {
        case 'develop':
            return 'dev'
        case ~/^release\/.*/:
            return 'staging'
        case 'main':
            return 'production'
        default:
            return 'build'
    }
}