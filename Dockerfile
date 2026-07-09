FROM eclipse-temurin:21

WORKDIR /app

COPY . .

RUN apt-get update && apt-get install -y maven

RUN mvn clean package -DskipTests

EXPOSE 8080

CMD sh -c "java -jar $(find target -name '*.jar' | head -n 1)"
