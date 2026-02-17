pipeline {
    agent any
    stages {
        stage('Test-auth') {
            steps {
                dir ('services/auth-service') {
                    sh '''
                    npm ci
                    npm test
                    '''
                }
            }
        }
        stage('Build-frontend') {
            steps {
                dir ('services/frontend') {
                    sh '''
                    npm ci
                    npm run build
                    '''
                }
            }
        }
    }
}
