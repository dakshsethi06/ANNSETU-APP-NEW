#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_system.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "esp_event.h"
#include "nvs_flash.h"
#include "mqtt_client.h"
#include "esp_ota_ops.h"
#include "esp_https_ota.h"
#include "esp_eth.h"
#include "esp_eth_mac_openeth.h"
#include "esp_mac.h"
#include "cJSON.h"

static const char *TAG = "MASTER_NODE";

// HiveMQ Public Broker
#define BROKER_URL "mqtt://broker.hivemq.com"
char mac_address_str[18] = {0};
char cmd_status_topic[50];
char cmd_ota_topic[50];
char stat_topic[50];

bool is_device_active = true;
esp_mqtt_client_handle_t mqtt_client;

// Function to publish current status
void publish_status() {
    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "status", is_device_active ? "active" : "inactive");
    char *payload = cJSON_PrintUnformatted(root);
    
    esp_mqtt_client_publish(mqtt_client, stat_topic, payload, 0, 1, 1);
    
    cJSON_Delete(root);
    free(payload);
}

// Perform OTA Update
void perform_ota_update(const char* url) {
    ESP_LOGI(TAG, "Starting OTA from URL: %s", url);
    esp_http_client_config_t config = {};
    config.url = url;
    config.cert_pem = NULL; // Warning: No TLS validation for mock testing!
    config.keep_alive_enable = true;

    esp_https_ota_config_t ota_config = {};
    ota_config.http_config = &config;

    ESP_LOGI(TAG, "Attempting to download update...");
    esp_err_t ret = esp_https_ota(&ota_config);
    if (ret == ESP_OK) {
        ESP_LOGI(TAG, "OTA Update successful! Rebooting...");
        esp_restart();
    } else {
        ESP_LOGE(TAG, "OTA Update failed");
    }
}

// MQTT Event Handler
static void mqtt_event_handler(void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data) {
    esp_mqtt_event_handle_t event = (esp_mqtt_event_handle_t)event_data;
    if (event_id == MQTT_EVENT_CONNECTED) {
        ESP_LOGI(TAG, "MQTT Connected");
        esp_mqtt_client_subscribe(mqtt_client, cmd_status_topic, 1);
        esp_mqtt_client_subscribe(mqtt_client, cmd_ota_topic, 1);
        publish_status();
    } else if (event_id == MQTT_EVENT_DATA) {
        char topic[100];
        char data[256];
        snprintf(topic, sizeof(topic), "%.*s", event->topic_len, event->topic);
        snprintf(data, sizeof(data), "%.*s", event->data_len, event->data);

        ESP_LOGI(TAG, "Received on %s: %s", topic, data);
        cJSON *json = cJSON_Parse(data);
        if (json) {
            if (strcmp(topic, cmd_status_topic) == 0) {
                cJSON *action = cJSON_GetObjectItem(json, "action");
                if (action && cJSON_IsString(action)) {
                    if (strcmp(action->valuestring, "active") == 0) {
                        is_device_active = true;
                        publish_status();
                    } else if (strcmp(action->valuestring, "inactive") == 0) {
                        is_device_active = false;
                        publish_status();
                    }
                }
            } else if (strcmp(topic, cmd_ota_topic) == 0) {
                cJSON *url = cJSON_GetObjectItem(json, "url");
                if (url && cJSON_IsString(url)) {
                    perform_ota_update(url->valuestring);
                }
            }
            cJSON_Delete(json);
        }
    }
}

// Initialize Ethernet (OpenCores MAC for QEMU)
void init_qemu_ethernet() {
    esp_netif_init();
    esp_event_loop_create_default();
    esp_netif_config_t cfg = ESP_NETIF_DEFAULT_ETH();
    esp_netif_t *eth_netif = esp_netif_new(&cfg);
    
    eth_mac_config_t mac_config = ETH_MAC_DEFAULT_CONFIG();
    esp_eth_mac_t *mac = esp_eth_mac_new_openeth(&mac_config);
    eth_phy_config_t phy_config = ETH_PHY_DEFAULT_CONFIG();
    phy_config.autonego_timeout_ms = 100;
    esp_eth_phy_t *phy = esp_eth_phy_new_dp83848(&phy_config); // QEMU often mocks this PHY
    
    esp_eth_config_t config = ETH_DEFAULT_CONFIG(mac, phy);
    esp_eth_handle_t eth_handle = NULL;
    esp_eth_driver_install(&config, &eth_handle);
    
    void *glpi = NULL; // Glue logic for QEMU openeth usually not needed for ESP-IDF v5+
    esp_netif_attach(eth_netif, esp_eth_new_netif_glue(eth_handle));
    esp_eth_start(eth_handle);
}

char telemetry_topic[60];

// Function to publish fake sensor telemetry
void publish_telemetry() {
    float fake_temp = 4.0f + ((esp_random() % 30) / 10.0f);  // 4.0 - 7.0 °C
    float fake_humidity = 85.0f + ((esp_random() % 100) / 10.0f); // 85.0 - 95.0 %

    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "device_id", mac_address_str);
    cJSON_AddNumberToObject(root, "temperature", fake_temp);
    cJSON_AddNumberToObject(root, "humidity", fake_humidity);
    cJSON_AddNumberToObject(root, "battery_voltage", 3.7);
    cJSON_AddNumberToObject(root, "rssi", -65);
    char *payload = cJSON_PrintUnformatted(root);

    esp_mqtt_client_publish(mqtt_client, telemetry_topic, payload, 0, 0, 0);
    ESP_LOGI(TAG, "Published telemetry: temp=%.1f°C hum=%.1f%%", fake_temp, fake_humidity);

    cJSON_Delete(root);
    free(payload);
}

extern "C" void app_main(void) {
    ESP_LOGI(TAG, "Starting Master Node Mock in QEMU");
    nvs_flash_init();
    
    // 1. Initialize Network
    init_qemu_ethernet();

    // 2. Setup MAC and Topics
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_ETH);
    sprintf(mac_address_str, "%02x:%02x:%02x:%02x:%02x:%02x", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    
    sprintf(cmd_status_topic, "device/%s/cmd/status", mac_address_str);
    sprintf(cmd_ota_topic, "device/%s/cmd/ota", mac_address_str);
    sprintf(stat_topic, "device/%s/stat/status", mac_address_str);
    sprintf(telemetry_topic, "annsetu/telemetry/%s", mac_address_str);

    ESP_LOGI(TAG, "MAC Address: %s", mac_address_str);

    // 3. Connect MQTT
    esp_mqtt_client_config_t mqtt_cfg = {};
    mqtt_cfg.broker.address.uri = BROKER_URL;
    
    mqtt_client = esp_mqtt_client_init(&mqtt_cfg);
    esp_mqtt_client_register_event(mqtt_client, MQTT_EVENT_ANY, mqtt_event_handler, NULL);
    esp_mqtt_client_start(mqtt_client);
    
    // Main Loop
    int tick = 0;
    while (1) {
        if (is_device_active) {
            ESP_LOGI(TAG, "Device is ACTIVE. Operating normally.");
            // Publish telemetry every 30 seconds (every 6 ticks of 5s)
            if (tick % 6 == 0) {
                publish_telemetry();
            }
        } else {
            ESP_LOGW(TAG, "Device is INACTIVE. Idling.");
        }
        tick++;
        vTaskDelay(5000 / portTICK_PERIOD_MS);
    }
}
