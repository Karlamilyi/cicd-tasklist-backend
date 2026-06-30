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
                sh 'npm run test:coverage -- --outputFile.junit=reports/junit-unit.xml'
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
                    sh """
                        npx sonarqube-scanner \
                        -Dsonar.host.url=\$SONAR_HOST_URL \
                        -Dsonar.login=\$SONAR_TOKEN \
                        -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                    """
                }
            }
        }

        stage('Quality Gate') {
            steps {
                script {
                    timeout(time: 5, unit: 'MINUTES') {
                        def ceTaskUrl = sh(
                            script: "grep ceTaskUrl= .scannerwork/report-task.txt | cut -d'=' -f2-",
                            returnStdout: true
                        ).trim()

                        def taskStatus = ''
                        def analysisId = ''
                        while (taskStatus != 'SUCCESS') {
                            def taskResponse = sh(
                                script: "curl -s -u \$SONAR_TOKEN: '${ceTaskUrl}'",
                                returnStdout: true
                            ).trim()

                            taskStatus = sh(
                                script: "echo '${taskResponse}' | grep -o '\"status\":\"[A-Z]*\"' | head -1 | cut -d'\"' -f4",
                                returnStdout: true
                            ).trim()

                            if (taskStatus == 'FAILED' || taskStatus == 'CANCELED') {
                                error "L'analyse SonarQube a échoué (status: ${taskStatus})"
                            }
                            if (taskStatus != 'SUCCESS') {
                                sleep(time: 10, unit: 'SECONDS')
                            } else {
                                analysisId = sh(
                                    script: "echo '${taskResponse}' | grep -o '\"analysisId\":\"[^\"]*\"' | cut -d'\"' -f4",
                                    returnStdout: true
                                ).trim()
                            }
                        }

                        def qgResponse = sh(
                            script: "curl -s -u \$SONAR_TOKEN: '${SONAR_HOST_URL}/api/qualitygates/project_status?analysisId=${analysisId}'",
                            returnStdout: true
                        ).trim()

                        def qgStatus = sh(
                            script: "echo '${qgResponse}' | grep -o '\"status\":\"[A-Z]*\"' | head -1 | cut -d'\"' -f4",
                            returnStdout: true
                        ).trim()

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