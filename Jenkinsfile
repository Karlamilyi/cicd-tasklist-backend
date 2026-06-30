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
                sh 'npm ci'
            }
        }

        stage('Generate Prisma client') {
            steps {
                sh 'npx prisma generate'
            }
        }

        stage('Unit tests') {
            steps {
                sh 'npm test -- --outputFile.junit=reports/junit-unit.xml'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'reports/junit-unit.xml'
                }
            }
        }

        stage('E2E tests') {
            steps {
                sh 'npm run test:e2e -- --outputFile.junit=reports/junit-e2e.xml'
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
                    sh '''
                        sonar-scanner \
                        -Dsonar.host.url=$SONAR_HOST_URL \
                        -Dsonar.login=$SONAR_TOKEN
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                script {
                    def reportFile = '.scannerwork/report-task.txt'
                    def props = readProperties file: reportFile
                    def ceTaskUrl = props['ceTaskUrl']

                    timeout(time: 5, unit: 'MINUTES') {
                        def taskStatus = ''
                        while (taskStatus != 'SUCCESS') {
                            def taskResponse = sh(
                                script: "curl -s -u ${SONAR_TOKEN}: ${ceTaskUrl}",
                                returnStdout: true
                            ).trim()
                            def taskJson = readJSON text: taskResponse
                            taskStatus = taskJson.task.status

                            if (taskStatus == 'FAILED' || taskStatus == 'CANCELED') {
                                error "L'analyse SonarQube a échoué (status: ${taskStatus})"
                            }
                            if (taskStatus != 'SUCCESS') {
                                sleep(time: 10, unit: 'SECONDS')
                            }
                        }

                        def analysisId = readJSON(text: sh(
                            script: "curl -s -u ${SONAR_TOKEN}: ${ceTaskUrl}",
                            returnStdout: true
                        ).trim()).task.analysisId

                        def qgResponse = sh(
                            script: "curl -s -u ${SONAR_TOKEN}: ${SONAR_HOST_URL}/api/qualitygates/project_status?analysisId=${analysisId}",
                            returnStdout: true
                        ).trim()
                        def qgJson = readJSON text: qgResponse
                        def qgStatus = qgJson.projectStatus.status

                        echo "Quality Gate status: ${qgStatus}"
                        if (qgStatus != 'OK') {
                            error "Quality Gate SonarQube en échec (status: ${qgStatus})"
                        }
                    }
                }
            }
        }

        stage('Docker build') {
            steps {
                sh 'docker build -t $DOCKER_IMAGE:$IMAGE_TAG -t $DOCKER_IMAGE:latest .'
            }
        }

        stage('Trivy scan') {
            steps {
                sh '''
                    trivy image --severity HIGH,CRITICAL --exit-code 1 \
                    --format json -o trivy-report.json $DOCKER_IMAGE:$IMAGE_TAG
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.json', fingerprint: true, allowEmptyArchive: true
                }
            }
        }

        stage('Generate SBOM') {
            steps {
                sh 'trivy image --format cyclonedx -o sbom.json $DOCKER_IMAGE:$IMAGE_TAG'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'sbom.json', fingerprint: true, allowEmptyArchive: true
                }
            }
        }

        stage('Docker push') {
            steps {
                sh 'echo $DOCKERHUB_CREDENTIALS_PSW | docker login -u $DOCKERHUB_CREDENTIALS_USR --password-stdin'
                sh 'docker push $DOCKER_IMAGE:$IMAGE_TAG'
                sh 'docker push $DOCKER_IMAGE:latest'
            }
        }
    }

    post {
        always {
            sh 'docker logout || true'
            cleanWs()
        }
    }
}