idf_component_register(SRCS "main.cpp"
                       INCLUDE_DIRS "."
                       REQUIRES esp_netif nvs_flash mqtt esp_https_ota esp_hw_support esp_eth app_update json)
