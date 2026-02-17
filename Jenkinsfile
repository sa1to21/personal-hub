pipeline {
    agent any
    stages {
        stage('Test-auth') {
            steps {
                dir ('services/auth-service') {
                    sh '''
                    npm install
                    npm test
                    '''
                }
            }
        }
        stage('Build-frontend') {
            steps {
                dir ('services/frontend') {
                    sh '''
                    npm install
                    npm run build
                    '''
                }
            }
        }
    }
}
