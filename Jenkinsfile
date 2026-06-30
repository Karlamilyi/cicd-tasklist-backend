pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = credentials('mouuuuuu-dockerhub-password')
        SONAR_TOKEN            = credentials('mouuuuuu-sonar-token')
        DOCKER_IMAGE           = "mouuuuuu/cicd-tasklist-backend"
        IMAGE_TAG              = "${env.BUILD_NUMBER}"
        SONAR_HOST_URL          = "https://sonarqube.cicd.kits.ext.educentre.fr"
    }

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    triggers {
        pollSCM('H/2 * * * *')
    }

    stages {

        stage('Install dependencies') {
            steps {
                bat 'npm ci'
            }
        }

        stage('Generate Prisma client') {
            steps {
                bat 'npx prisma generate'
            }
        }

        stage('Unit tests') {
            steps {
                bat 'npm test -- --outputFile.junit=reports/junit-unit.xml'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'reports/junit-unit.xml'
                }
            }
        }

        stage('E2E tests') {
            steps {
                bat 'npm run test:e2e -- --outputFile.junit=reports/junit-e2e.xml'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'reports/junit-e2e.xml'
                }
            }
        }

        stage('SonarQube analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    bat """
                        sonar-scanner ^
                        -Dsonar.host.url=%SONAR_HOST_URL% ^
                        -Dsonar.login=%SONAR_TOKEN%
                    """
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Docker build') {
            steps {
                bat "docker build -t %DOCKER_IMAGE%:%IMAGE_TAG% -t %DOCKER_IMAGE%:latest ."
            }
        }

        stage('Trivy scan') {
            steps {
                bat """
                    trivy image --severity HIGH,CRITICAL --exit-code 1 ^
                    --format json -o trivy-report.json %DOCKER_IMAGE%:%IMAGE_TAG%
                """
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.json', fingerprint: true, allowEmptyArchive: true
                }
            }
        }

        stage('Generate SBOM') {
            steps {
                bat "trivy image --format cyclonedx -o sbom.json %DOCKER_IMAGE%:%IMAGE_TAG%"
            }
            post {
                always {
                    archiveArtifacts artifacts: 'sbom.json', fingerprint: true, allowEmptyArchive: true
                }
            }
        }

        stage('Docker push') {
            steps {
                bat "echo %DOCKERHUB_CREDENTIALS_PSW% | docker login -u %DOCKERHUB_CREDENTIALS_USR% --password-stdin"
                bat "docker push %DOCKER_IMAGE%:%IMAGE_TAG%"
                bat "docker push %DOCKER_IMAGE%:latest"
            }
        }
    }

    post {
        always {
            bat "docker logout || exit 0"
            cleanWs()
        }
    }
}