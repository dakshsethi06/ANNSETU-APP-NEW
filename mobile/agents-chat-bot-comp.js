Lyte.Component.register("agents-chat-bot-comp", {
_template:"<template tag-name=\"agents-chat-bot-comp\"> <div class=\"agents-chat-bot {{if(expHandlers(chatDefaultOpen,'!'),'minimized')}}\"> <div class=\"agents-chat-container {{if(initFailed,'init-failed')}}\"> <template is=\"if\" value=\"{{expHandlers(initFailed,'!')}}\"><template case=\"true\"><div class=\"agents-chat-header\"> <div class=\"agents-chat-header-left\"> <template is=\"if\" value=\"{{customIconUrl}}\"><template case=\"true\"><img src=\"{{customIconUrl}}\" class=\"agents-chat-logo-img\" automation-id=\"AgentsChatBotSdkCustomIcon\"></template><template case=\"false\"><template is=\"if\" value=\"{{defaultAvatarUrl}}\"><template case=\"true\"><img src=\"{{defaultAvatarUrl}}\" class=\"agents-chat-logo-img\" alt=\"{{agentHeaderName}}\" automation-id=\"AgentsChatBotSdkDefaultAvatar\"></template><template case=\"false\"><div class=\"agents-chat-logo-placeholder\"></div></template></template></template></template> <span class=\"agents-chat-title\">{{agentHeaderName}}</span> </div> <div class=\"agents-chat-header-right\"> <div class=\"agents-chat-reload-wrapper {{if(expHandlers(sessionId,'!'),'disabled')}}\"> <div class=\"agents-chat-reload\" automation-id=\"AgentsChatBotSdkReloadBtn\" onclick=\"{{action('resetChat')}}\"></div> <span class=\"agents-chat-tooltip\">Clear Chat</span> </div> <div class=\"agents-chat-close\" automation-id=\"AgentsChatBotSdkHeaderClose\" onclick=\"{{action('toggleAgentsChat')}}\"></div> </div> </div></template><template case=\"false\"><div> <div class=\"agents-chat-close init-failed\" automation-id=\"AgentsChatBotSdkErrorClose\" onclick=\"{{action('toggleAgentsChat')}}\"></div> </div></template></template> <template is=\"if\" value=\"{{sdkAlertMsg}}\"><template case=\"true\"><div class=\"showAlert showAlert-{{sdkAlertType}}\"> {{sdkAlertMsg}} </div></template></template> <template is=\"if\" value=\"{{initFailed}}\"><template case=\"true\"><div class=\"agents-init-error\"> <div class=\"agents-error-icon\"></div> <div class=\"error-title\">Unable to start chat</div> <div class=\"error-desc\">We couldn’t connect right now. Please try again. If the issue persists, contact your administrator.</div> </div></template><template case=\"false\"><template is=\"if\" value=\"{{showSdkKeyCard}}\"><template case=\"true\"><div class=\"agents-sdk-card\"> <div class=\"agents-chat-private-icon\"></div> <div class=\"agents-sdk-title\">Private access enabled</div> <div class=\"agents-sdk-desc\">This chat is restricted. Enter a valid access key to continue.</div> <div class=\"agents-sdk-card-inner\"> <label class=\"agents-sdk-label\">Access key</label> <input type=\"password\" class=\"agents-sdk-input {{if(sdkAuthLoading,'agents-sdk-submit-disabled')}}\" automation-id=\"AgentsChatBotSdkAccessKeyField\" placeholder=\"Paste your access key\" oninput=\"{{action('onSdkKeyInput')}}\"> <div class=\"agents-sdk-hint\">Provided by your organization administrator</div> <template is=\"if\" value=\"{{expHandlers(sdkKeyValue,'&amp;&amp;',expHandlers(sdkAuthLoading,'!'))}}\"><template case=\"true\"><button class=\"agents-sdk-submit\" automation-id=\"AgentsChatBotSdkVerifySubmit\" onclick=\"{{action('submitSdkKey')}}\"> Verify &amp; Continue </button></template><template case=\"false\"><button class=\"agents-sdk-submit agents-sdk-submit-disabled\" automation-id=\"AgentsChatBotSdkVerifyLoading\"> <template is=\"if\" value=\"{{sdkAuthLoading}}\"><template case=\"true\"><span class=\"agents-circle-loader\"></span></template><template case=\"false\"><span>Verify &amp; Continue</span></template></template> </button></template></template> </div> <div class=\"agents-sdk-hint\">Having trouble? Contact your administrator for access.</div> </div></template><template case=\"false\"><div class=\"agents-chat-main\"> <div class=\"agents-chat-body\" id=\"chatBody\"> <template items=\"{{agentUserChatHistory}}\" item=\"message\" index=\"index\" is=\"for\"><div class=\"agents-chat-message agents-chat-message-{{message.messagetype}}\" automation-id=\"AgentsChatBotSdkChatEntry{{index}}\"> <template is=\"if\" value=\"{{expHandlers(expHandlers(message.messagetype,'==','bot'),'&amp;&amp;',customIconUrl)}}\"><template case=\"true\"><img src=\"{{customIconUrl}}\" alt=\"{{agentHeaderName}}\" class=\"agents-chat-bot-avatar\" automation-id=\"AgentsChatBotSdkBotAvatar{{index}}\"></template><template case=\"false\"><template is=\"if\" value=\"{{expHandlers(expHandlers(message.messagetype,'==','bot'),'&amp;&amp;',defaultAvatarUrl)}}\"><template case=\"true\"><img src=\"{{defaultAvatarUrl}}\" alt=\"{{agentHeaderName}}\" class=\"agents-chat-bot-avatar\" automation-id=\"AgentsChatBotSdkBotAvatarDefault{{index}}\"></template></template></template></template> <template is=\"if\" value=\"{{expHandlers(message.attachments,'&amp;&amp;',message.attachments.length)}}\"><template case=\"true\"><div class=\"agents-message-attachments\"> <template items=\"{{message.attachments}}\" item=\"att\" index=\"attIdx\" is=\"for\"><div> <template is=\"if\" value=\"{{expHandlers(att.isImageFile,'!')}}\"><template case=\"true\"><div class=\"agents-chat-file-doc-card\" title=\"{{att.name}}\" automation-id=\"AgentsChatBotSdkFileAttachmentPreview{{attIdx}}\"> <span class=\"agents-chat-file-icon agents-chat-file-icon-{{att.fileExtension}}\"></span> <div class=\"agents-chat-file-doc-info\"> <span class=\"agents-chat-file-doc-name\">{{att.name}}</span> <div class=\"agents-chat-file-doc-meta\"> <span>{{att.fileExtensionLabel}}</span> <span>·</span> <span>{{att.fileSize}}</span> </div> </div> </div></template></template> </div></template> <div class=\"agents-chat-images-row\"> <template items=\"{{message.attachments}}\" item=\"att\" index=\"attIdx\" is=\"for\"><div> <template is=\"if\" value=\"{{expHandlers(att.isImageFile,'&amp;&amp;',att.previewUrl)}}\"><template case=\"true\"><img src=\"{{att.previewUrl}}\" title=\"{{att.name}}\" class=\"agents-chat-image-preview\" automation-id=\"AgentsChatBotSdkAttachmentPreview{{attIdx}}\" onclick=\"{{action('openImagePreview',att.previewUrl,att.name)}}\"></template></template> </div></template> </div> </div></template></template> <div class=\"agents-chat-bubble\" automation-id=\"AgentsChatBotSdkReplyBubble{{index}}\"> <template is=\"if\" value=\"{{message.message}}\"><template case=\"true\"><div> {{unescape(message.message)}} </div></template></template> </div> <template is=\"if\" value=\"{{expHandlers(message.messagetype,'==','bot')}}\"><template case=\"true\"><div class=\"agents-chat-time agents-chat-time-{{message.messagetype}}\" automation-id=\"AgentsChatBotSdkBotTimestamp{{index}}\"> <div class=\"agents-chat-name-time-container\"> <span>{{message.time}}</span> </div> </div></template></template> <template is=\"if\" value=\"{{expHandlers(message.messagetype,'!=','bot')}}\"><template case=\"true\"><div class=\"agents-chat-time agents-chat-time-{{message.messagetype}}\" automation-id=\"AgentsChatBotSdkUserTimestamp{{index}}\"> {{message.time}} </div></template></template> </div></template> <template is=\"if\" value=\"{{waitingForAgentResponse}}\"><template case=\"true\"><div class=\"agents-chat-message agents-chat-message-bot agents-chat-loader\" automation-id=\"AgentsChatBotSdkTypingIndicator\"> <template is=\"if\" value=\"{{customIconUrl}}\"><template case=\"true\"><img src=\"{{customIconUrl}}\" alt=\"{{agentHeaderName}}\" class=\"agents-chat-bot-avatar\"></template><template case=\"false\"><template is=\"if\" value=\"{{defaultAvatarUrl}}\"><template case=\"true\"><img src=\"{{defaultAvatarUrl}}\" alt=\"{{agentHeaderName}}\" class=\"agents-chat-bot-avatar\"></template></template></template></template> <div class=\"agents-chat-bubble\" automation-id=\"AgentsChatBotSdkTypingBubble\"> <span class=\"dot\"></span> <span class=\"dot\"></span> <span class=\"dot\"></span> </div> <div class=\"agents-chat-time agents-chat-time-bot\" automation-id=\"AgentsChatBotSdkTypingStatus\"> {{multiAgentsPoolsMessage}} </div> </div></template></template> </div> <div class=\"agents-chat-input\"> <template is=\"if\" value=\"{{expHandlers(fileDetails,'&amp;&amp;',fileDetails.length)}}\"><template case=\"true\"><div class=\"agents-upload-preview\"> <template items=\"{{fileDetails}}\" item=\"fileItem\" index=\"fIndex\" is=\"for\"><div> <template is=\"if\" value=\"{{fileItem.isImageFile}}\"><template case=\"true\"><div class=\"preview-wrapper\" title=\"{{fileItem.name}}\"> <template is=\"if\" value=\"{{fileItem.previewUrl}}\"><template case=\"true\"><img src=\"{{fileItem.previewUrl}}\" class=\"preview-img\"></template></template> <template is=\"if\" value=\"{{expHandlers(fileItem.uploadState,'==','uploading')}}\"><template case=\"true\"><div class=\"preview-overlay\"> <div class=\"preview-spinner\"></div> </div></template></template> <template is=\"if\" value=\"{{expHandlers(fileItem.uploadState,'!=','uploading')}}\"><template case=\"true\"><div class=\"preview-close\" automation-id=\"AgentsChatBotSdkRemoveAttachment{{fIndex}}\" onclick=\"{{action('removeUploadedFile',fIndex)}}\"></div></template></template> </div></template><template case=\"false\"><div class=\"agents-chat-file-doc-card\" title=\"{{fileItem.name}}\"> <span class=\"agents-chat-file-icon agents-chat-file-icon-{{fileItem.fileExtension}}\"></span> <div class=\"agents-chat-file-doc-info\"> <span class=\"agents-chat-file-doc-name\">{{fileItem.name}}</span> <template is=\"if\" value=\"{{expHandlers(fileItem.uploadState,'==','uploading')}}\"><template case=\"true\"><span class=\"agents-chat-file-doc-meta\">Uploading...</span></template><template case=\"false\"><div class=\"agents-chat-file-doc-meta\"> <span>{{fileItem.fileExtensionLabel}}</span> <span>·</span> <span>{{fileItem.fileSizeLabel}}</span> </div></template></template> </div> <template is=\"if\" value=\"{{expHandlers(fileItem.uploadState,'==','uploading')}}\"><template case=\"true\"><div class=\"preview-overlay\"> <div class=\"preview-spinner\"></div> </div></template></template> <template is=\"if\" value=\"{{expHandlers(fileItem.uploadState,'!=','uploading')}}\"><template case=\"true\"><div class=\"preview-close\" automation-id=\"AgentsChatBotSdkRemoveAttachment{{fIndex}}\" onclick=\"{{action('removeUploadedFile',fIndex)}}\"></div></template></template> </div></template></template> </div></template> </div></template></template> <div class=\"agents-input-row\"> <template is=\"if\" value=\"{{isWebChatAttachmentEnabled}}\"><template case=\"true\"><label class=\"agents-chat-upload-btn {{if(expHandlers(expHandlers(waitingForAgentResponse,'||',expHandlers(uploadState,'==','uploading')),'||',expHandlers(fileDetails.length,'>=',3)),'agents-sdk-submit-disabled')}}\" automation-id=\"AgentsChatBotSdkFileUploadLabel\"> <input accept=\"{{fileAcceptTypes}}\" type=\"file\" multiple=\"\" class=\"agents-chat-file-input\" automation-id=\"AgentsChatBotSdkFileChooser\" onchange=\"{{action('handleFileUpload')}}\" hidden=\"\"> <span class=\"agents-chat-plus-icon\">+</span> </label></template></template> <textarea class=\"agents-chat-text-input\" automation-id=\"AgentsChatBotSdkMessageComposer\"></textarea> <div class=\"zia-agents-send-button {{if(expHandlers(expHandlers(expHandlers(uploadState,'==','uploading'),'||',expHandlers(canSendMessage,'!')),'||',waitingForAgentResponse),'disabled')}}\" automation-id=\"AgentsChatBotSdkSendMessage\" onclick=\"{{action('sendMessage')}}\"></div> </div> </div> </div></template></template></template></template> <div class=\"agents-chat-footer\"> <span class=\"zia-agents-icon\"></span> Powered by Zia Agents </div> <template is=\"if\" value=\"{{previewImageUrl}}\"><template case=\"true\"><div class=\"agents-image-preview-overlay\" automation-id=\"AgentsChatBotSdkImagePreviewOverlay\"> <div class=\"agents-image-preview-close\" automation-id=\"AgentsChatBotSdkImagePreviewClose\" onclick=\"{{action('closeImagePreview')}}\"></div> <img src=\"{{previewImageUrl}}\" alt=\"{{previewImageName}}\" class=\"agents-image-preview-full\"> </div></template></template> </div> </div> <div class=\"agents-chat-launcher\" automation-id=\"AgentsChatBotSdkToggleLauncher\" onclick=\"{{action('toggleAgentsChat')}}\"> <template is=\"if\" value=\"{{expHandlers(customButton,'==',1)}}\"><template case=\"true\"><span class=\"zagent-api-chatbot1\"></span></template><template case=\"false\"><template is=\"if\" value=\"{{expHandlers(customButton,'==',2)}}\"><template case=\"true\"><span class=\"zagent-api-chatbot2\"></span></template><template case=\"false\"><template is=\"if\" value=\"{{expHandlers(customButton,'==',3)}}\"><template case=\"true\"><span class=\"zagent-api-chatbot3\"></span></template><template case=\"false\"><template is=\"if\" value=\"{{expHandlers(customButton,'==',4)}}\"><template case=\"true\"><span class=\"zagent-api-chatbot4\"></span></template></template></template></template></template></template></template></template> </div> </template>\n<style>:root {\n  --agents-primary-color: #6B4EFF;\n}\n\n.agents-chat-bot {\n  position: fixed;\n  bottom: 80px;\n  right: 30px;\n  z-index: 9999;\n}\n\n.agents-chat-bot.minimized {\n  display: none;\n}\n\n.agents-chat-container {\n  width: 380px;\n  height: 540px;\n  background: var(--agents-primary-color);\n  border-radius: 16px;\n  box-shadow: 0px 2px 6px -1px #00000014;\n  display: flex;\n  flex-direction: column;\n  font-family: system-ui, sans-serif;\n  position: relative;\n}\n\n.agents-chat-container.init-failed {\n  background: #FCFCFC;\n}\n\n.agents-chat-message {\n  animation: chatFadeIn 0.25s ease-out both;\n}\n\n.agents-chat-message-user {\n  animation-name: chatSlideInRight;\n}\n\n.agents-chat-message-bot {\n  animation-name: chatSlideInLeft;\n}\n\n@keyframes chatFadeIn {\n  from {\n    opacity: 0;\n  }\n\n  to {\n    opacity: 1;\n  }\n}\n\n@keyframes chatSlideInRight {\n  from {\n    opacity: 0;\n    transform: translateX(12px);\n  }\n\n  to {\n    opacity: 1;\n    transform: translateX(0);\n  }\n}\n\n@keyframes chatSlideInLeft {\n  from {\n    opacity: 0;\n    transform: translateX(-12px);\n  }\n\n  to {\n    opacity: 1;\n    transform: translateX(0);\n  }\n}\n\n.agents-chat-container * {\n  box-sizing: border-box;\n}\n\n.agents-chat-header {\n  height: 60px;\n  width: 100%;\n  padding: 0 20px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  color: #fff;\n}\n\n.agents-chat-header-left {\n  width: 86%;\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n\n.agents-chat-header-right {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n}\n\n.agents-chat-reload-wrapper {\n  position: relative;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n\n.agents-chat-reload {\n  width: 18px;\n  height: 18px;\n  background-color: #fff;\n  mask-image: var(--sprite-icons-url);\n  mask-repeat: no-repeat;\n  mask-size: auto;\n  mask-position: -583px -727px;\n  cursor: pointer;\n  flex-shrink: 0;\n}\n\n.agents-chat-tooltip {\n  position: absolute;\n  top: calc(100% + 8px);\n  left: 50%;\n  transform: translateX(-50%);\n  background: #1f1f1f;\n  color: #fff;\n  font-size: 12px;\n  padding: 4px 10px;\n  border-radius: 6px;\n  white-space: nowrap;\n  opacity: 0;\n  pointer-events: none;\n  transition: opacity 0.2s ease;\n  z-index: 10;\n}\n\n.agents-chat-tooltip::before {\n  content: \"\";\n  position: absolute;\n  bottom: 100%;\n  left: 50%;\n  transform: translateX(-50%);\n  border: 5px solid transparent;\n  border-bottom-color: #1f1f1f;\n}\n\n.agents-chat-reload-wrapper:not(.disabled):hover .agents-chat-tooltip {\n  opacity: 1;\n}\n\n.agents-chat-reload-wrapper.disabled .agents-chat-reload {\n  opacity: 0.4;\n  cursor: not-allowed;\n}\n\n.agents-chat-reload-wrapper.disabled {\n  pointer-events: none;\n}\n\n.agents-chat-logo-placeholder {\n  width: 24px;\n  height: 24px;\n  background-image: var(--sprite-icons-url);\n  background-position: -1571px -284px;\n  flex-shrink: 0;\n}\n\n.agents-chat-logo-img {\n  width: 34px;\n  height: 34px;\n  border-radius: 8px;\n  object-fit: cover;\n  flex-shrink: 0;\n}\n\n.agents-launcher-custom-icon {\n  width: 24px;\n  height: 24px;\n  border-radius: 50%;\n  object-fit: cover;\n}\n\n.agents-chat-title {\n  font-size: 16px;\n  font-weight: 500;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  margin-right: 10px;\n}\n\n.agents-chat-close {\n  width: 26px;\n  height: 26px;\n  background-image: var(--sprite-icon-url), linear-gradient(#2B2B34BA);\n  background-position: -86px -151px;\n  border-radius: 5px;\n  cursor: pointer;\n  flex-shrink: 0;\n}\n\n.agents-chat-close.init-failed {\n  position: absolute;\n  right: 15px;\n  top: 15px;\n}\n\n.agents-chat-body {\n  flex: 1;\n  padding: 24px;\n  overflow-y: auto;\n  background: #fff;\n  border-radius: 16px 16px 0 0;\n  scrollbar-width: thin;\n  scrollbar-color: #d4d3de transparent;\n}\n\n.agents-chat-body::-webkit-scrollbar {\n  width: 4px;\n}\n\n.agents-chat-body::-webkit-scrollbar-track {\n  background: transparent;\n}\n\n.agents-chat-body::-webkit-scrollbar-thumb {\n  background: #d4d3de;\n  border-radius: 4px;\n}\n\n.agents-chat-message {\n  display: flex;\n  flex-direction: column;\n  width: 100%;\n  margin-bottom: 17px;\n}\n\n.agents-chat-message-bot {\n  align-items: flex-start;\n  position: relative;\n  padding-left: 25px;\n}\n\n.agents-chat-message-bot::before {\n  content: none;\n}\n\n.agents-chat-bot-avatar {\n  position: absolute;\n  left: 0;\n  bottom: -3px;\n  width: 22px;\n  height: 22px;\n  border-radius: 50%;\n  object-fit: cover;\n  flex-shrink: 0;\n}\n\n.agents-chat-message-bot::after {\n  content: \"\";\n  position: absolute;\n  left: 14px;\n  bottom: -6px;\n  width: 6px;\n  height: 6px;\n  background: #4ade80;\n  border-radius: 50%;\n  border: 2px solid #ffffff;\n}\n\n.agents-chat-message-user {\n  align-items: flex-end;\n}\n\n.agents-chat-bubble {\n  padding: 12px 20px;\n  border-radius: 12px;\n  font-size: 14px;\n  line-height: 20px;\n  max-width: 90%;\n  width: fit-content;\n  word-wrap: break-word;\n  overflow-wrap: break-word;\n  overflow: hidden;\n  box-shadow: 0 0 0 1px rgba(43, 43, 52, 0.08);\n}\n\n.agents-chat-bubble pre {\n  overflow-x: auto;\n  white-space: pre;\n  margin: 4px 0;\n  padding: 8px 12px;\n  background: #1e1e1e;\n  color: #d4d4d4;\n  border-radius: 6px;\n  font-size: 13px;\n  line-height: 20px;\n  max-width: 100%;\n}\n\n.agents-chat-bubble code {\n  font-size: 13px;\n  line-height: 20px;\n  font-family: monospace;\n}\n\n.agents-chat-bubble pre code {\n  background: none;\n  padding: 0;\n}\n\n.agents-chat-bubble ol,\n.agents-chat-bubble ul {\n  padding-left: 20px;\n  margin: 4px 0;\n}\n\n.agents-chat-bubble table {\n  border-collapse: collapse;\n  width: 100%;\n  display: block;\n  overflow-x: auto;\n  margin: 4px 0;\n  font-size: 13px;\n}\n\n.agents-chat-bubble th,\n.agents-chat-bubble td {\n  border: 1px solid #e5e7eb;\n  padding: 6px 10px;\n  text-align: left;\n  white-space: nowrap;\n}\n\n.agents-chat-bubble th {\n  background: #f3f4f6;\n  font-weight: 600;\n}\n\n.agents-chat-bubble blockquote {\n  margin: 8px 0;\n  padding: 4px 12px;\n  border-left: 3px solid #6B4EFF;\n  color: #4b5563;\n  line-height: 20px;\n}\n\n.agents-chat-bubble h1,\n.agents-chat-bubble h2,\n.agents-chat-bubble h3,\n.agents-chat-bubble h4,\n.agents-chat-bubble h5,\n.agents-chat-bubble h6 {\n  margin: 6px 0 4px;\n  line-height: 20px;\n}\n\n.agents-chat-bubble a {\n  color: #6B4EFF;\n  line-height: 20px;\n  word-break: break-all;\n}\n\n.agents-chat-bubble img {\n  max-width: 100%;\n  height: auto;\n  border-radius: 6px;\n}\n\n.agents-chat-bubble hr {\n  border: none;\n  border-top: 1px solid #e5e7eb;\n  margin: 8px 0;\n}\n\n.agents-chat-bubble p {\n  margin: 8px 0;\n  line-height: 20px;\n}\n\n.agents-chat-bubble>div:first-child>*:first-child {\n  margin-top: 0;\n}\n\n.agents-chat-bubble>div:first-child>*:last-child {\n  margin-bottom: 0;\n}\n\n.agents-chat-message-bot .agents-chat-bubble {\n  background: #2B2B3408;\n  color: #111827;\n}\n\n.agents-chat-message-user .agents-chat-bubble {\n  background: var(--agents-primary-color);\n  color: #fff;\n}\n\n.agents-chat-time {\n  font-size: 11px;\n  margin-top: 10px;\n  color: #7E8091;\n}\n\n.agents-chat-time-bot {\n  width: 100%;\n  margin-left: 12px;\n  text-align: left;\n}\n\n.agents-chat-time-user {\n  margin-right: 12px;\n  text-align: right;\n}\n\n.agents-chat-input {\n  border-top: 1px solid #e5e7eb;\n  padding: 8px 16px;\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n  background: #fff;\n}\n\n.agents-input-row {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n\n.agents-chat-text-input {\n  border: none;\n  outline: none;\n  box-shadow: none;\n  background: transparent;\n  font-size: 14px;\n  line-height: 20px;\n  padding: 0;\n  flex: 1;\n  resize: none;\n  height: 20px;\n  max-height: 80px;\n  overflow-y: auto;\n  font-family: system-ui, sans-serif;\n  scrollbar-width: thin;\n  scrollbar-color: #d4d3de transparent;\n}\n\n.agents-chat-text-input::-webkit-scrollbar {\n  width: 4px;\n}\n\n.agents-chat-text-input::-webkit-scrollbar-track {\n  background: transparent;\n}\n\n.agents-chat-text-input::-webkit-scrollbar-thumb {\n  background: #d4d3de;\n  border-radius: 4px;\n}\n\n.agents-chat-text-input:focus,\n.agents-chat-text-input:active,\n.agents-chat-text-input:hover {\n  border: none;\n  outline: none;\n  box-shadow: none;\n}\n\n.zia-agents-send-button {\n  width: 35px;\n  height: 35px;\n  border-radius: 10px;\n  background-color: var(--agents-primary-color);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer !important;\n  flex-shrink: 0;\n}\n\n.zia-agents-send-button::before {\n  content: \"\";\n  width: 24px;\n  height: 22px;\n  background-image: var(--sprite-icons-url);\n  background-position: -757px -637px !important;\n  background-repeat: no-repeat;\n  background-size: auto;\n  scale: 0.9;\n}\n\n.agents-chat-footer {\n  height: 22px;\n  font-size: 10px;\n  color: #6b7280;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  border-radius: 0 0 15px 15px;\n  background: #f0f0f0;\n}\n\n.agents-chat-launcher {\n  bottom: 30px;\n  right: 24px;\n  width: 44px;\n  height: 44px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--agents-primary-color);\n  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);\n  cursor: pointer;\n  z-index: 9999;\n  position: fixed;\n  border-radius: 12px 12px 3px 12px;\n}\n\n.zagent-api-chatbot1 {\n  display: inline-block;\n  background-image: var(--sprite-icons-url);\n  background-repeat: no-repeat;\n  background-size: auto;\n  background-position: -1384px -2085px !important;\n  width: 24px;\n  height: 18px;\n}\n\n.zagent-api-chatbot2 {\n  display: inline-block;\n  background-image: var(--sprite-icons-url);\n  background-repeat: no-repeat;\n  background-size: auto;\n  background-position: -1426px -2085px !important;\n  width: 24px;\n  height: 18px;\n}\n\n.zagent-api-chatbot3 {\n  display: inline-block;\n  background-image: var(--sprite-icons-url);\n  background-repeat: no-repeat;\n  background-size: auto;\n  background-position: -1468px -2085px !important;\n  width: 24px;\n  height: 17px;\n}\n\n.zagent-api-chatbot4 {\n  display: inline-block;\n  background-image: var(--sprite-icons-url);\n  background-repeat: no-repeat;\n  background-size: auto;\n  background-position: -1510px -2085px !important;\n  width: 24px;\n  height: 17px;\n}\n\n.agents-chat-loader {\n  padding-left: 30px;\n}\n\n.agents-chat-loader .agents-chat-bubble {\n  background: #2B2B3408;\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  height: 34px;\n  min-width: 56px;\n}\n\n.agents-chat-loader .dot {\n  width: 6px;\n  height: 6px;\n  border-radius: 50%;\n  background: var(--agents-primary-color);\n  animation: typing 1.4s infinite ease-in-out both;\n}\n\n.agents-chat-loader .dot:nth-child(1) {\n  animation-delay: 0s;\n}\n\n.agents-chat-loader .dot:nth-child(2) {\n  animation-delay: .2s;\n}\n\n.agents-chat-loader .dot:nth-child(3) {\n  animation-delay: .4s;\n}\n\n@keyframes typing {\n  0% {\n    opacity: .3;\n  }\n\n  50% {\n    opacity: 1;\n  }\n\n  100% {\n    opacity: .3;\n  }\n}\n\n.agents-sdk-card {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  align-items: center;\n  gap: 8px;\n  background: #FCFCFC;\n  border-radius: 16px 16px 0 0;\n  padding: 32px 24px 24px;\n}\n\n.agents-sdk-card-inner {\n  width: 100%;\n  background: #ffffff;\n  border-radius: 16px;\n  border: 1px solid #E8E8E8;\n  padding: 20px;\n  display: flex;\n  flex-direction: column;\n  gap: 14px;\n  margin-top: 10px;\n  margin-bottom: 10px;\n}\n\n.agents-sdk-title {\n  font-size: 14px;\n  font-weight: 600;\n  color: #111827;\n  text-align: center;\n}\n\n.agents-sdk-input {\n  height: 36px;\n  padding: 0 12px;\n  font-size: 14px;\n  border-radius: 8px;\n  border: 1px solid #e5e7eb;\n  outline: none;\n}\n\n.agents-sdk-input:focus {\n  border-color: var(--agents-primary-color);\n  box-shadow: 0px 0px 0px 1px #E9E3FF;\n}\n\n.agents-sdk-submit {\n  height: 36px;\n  border: none;\n  border-radius: 8px;\n  background: var(--agents-primary-color);\n  color: #ffffff;\n  font-size: 14px;\n  font-weight: 500;\n  cursor: pointer;\n  width: 135px;\n  margin-left: 25%;\n}\n\n.agents-chat-main {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  min-height: 0;\n  background: #fff;\n  border-radius: 16px 16px 0 0;\n  overflow: hidden;\n}\n\n.agents-chat-message-bot:not(.agents-chat-loader) {\n  animation: none;\n}\n\n.agents-circle-loader {\n  width: 18px;\n  height: 18px;\n  border: 2px solid rgba(255, 255, 255, 0.4);\n  border-top-color: #ffffff;\n  border-radius: 50%;\n  animation: agents-spin 0.8s linear infinite;\n  display: inline-block;\n}\n\n.showAlert {\n  position: absolute;\n  top: 70px;\n  left: 50%;\n  transform: translateX(-50%);\n  padding: 8px 16px;\n  border-radius: 8px;\n  font-size: 13px;\n  font-weight: 500;\n  z-index: 10000;\n  white-space: nowrap;\n  animation: fadeAlert 0.25s ease-out;\n}\n\n.showAlert-success {\n  background: #F2FDF4;\n  color: #22C543;\n}\n\n.showAlert-error {\n  background: #FDF2F2;\n  color: #DC2626;\n}\n\n.agents-chat-name-time-container {\n  width: 100%;\n  display: flex;\n  align-items: center;\n  color: #7E8091;\n}\n\n.agent-chat-name {\n  max-width: 70%;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.agent-chat-dot {\n  border: 1.5px solid;\n  border-radius: 50%;\n  margin-left: 6px;\n  margin-right: 6px;\n  color: #BABBC4;\n}\n\n.agents-chat-private-icon {\n  width: 31px;\n  height: 30px;\n  background-image: var(--sprite-icons-url);\n  background-position: -1176px -2079px;\n}\n\n.agents-sdk-desc {\n  font-size: 12px;\n  color: #7E8091;\n  text-align: center;\n  line-height: 20px;\n  font-weight: 400;\n}\n\n.agents-sdk-label {\n  font-size: 12px;\n  font-weight: 500;\n  color: #374151;\n}\n\n.agents-sdk-hint {\n  font-size: 12px;\n  color: #9ca3af;\n  margin-top: -6px;\n  font-weight: 400;\n}\n\n.agents-sdk-submit-disabled {\n  opacity: 0.5;\n  pointer-events: none;\n  cursor: not-allowed;\n}\n\n@keyframes fadeAlert {\n  from {\n    opacity: 0;\n    transform: translate(-50%, -6px);\n  }\n\n  to {\n    opacity: 1;\n    transform: translate(-50%, 0);\n  }\n}\n\n@keyframes agents-spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n\n.agents-chat-upload-btn {\n  width: 36px;\n  height: 36px;\n  min-width: 36px;\n  border-radius: 50%;\n  border: 1px solid #f3f3f3;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: pointer;\n  transition: background 0.2s ease;\n  position: relative;\n}\n\n.agents-chat-upload-btn:hover {\n  background-color: #e6e6e6;\n}\n\n.agents-chat-plus-icon {\n  width: 14px;\n  height: 14px;\n  background-color: #78829D;\n  mask-image: var(--sprite-icons-url);\n  mask-position: -761px -377px;\n  mask-repeat: no-repeat;\n  mask-size: auto;\n  flex-shrink: 0;\n  scale: 0.8;\n}\n\n.agents-chat-text-input {\n  flex: 1;\n}\n\n.agents-init-error {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  align-items: center;\n  background: #FCFCFC;\n  border-radius: 16px 16px 0 0;\n  padding: 32px 24px;\n  text-align: center;\n}\n\n.agents-init-error .error-title {\n  font-size: 14px;\n  font-weight: 600;\n  color: #111827;\n  margin-bottom: 10px;\n}\n\n.agents-init-error .error-desc {\n  font-size: 12px;\n  color: #6b7280;\n}\n\n.agents-init-error .agents-error-icon {\n  width: 30px;\n  height: 32px;\n  background-image: var(--sprite-icons-url);\n  background-position: -1340px -2078px;\n  margin-bottom: 12px;\n}\n\n.agents-chat-image-preview {\n  max-width: 100px;\n  max-height: 100px;\n  border-radius: 12px;\n  display: block;\n  border-radius: 8px;\n  box-shadow: 0 0 0 1px rgba(43, 43, 52, 0.08);\n  margin-bottom: 4px;\n  cursor: pointer;\n}\n\n.agents-image-preview-overlay {\n  position: absolute;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.75);\n  border-radius: 16px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 20;\n  animation: chatFadeIn 0.15s ease-out both;\n  padding: 16px;\n  box-sizing: border-box;\n}\n\n.agents-image-preview-full {\n  max-width: 100%;\n  max-height: 100%;\n  object-fit: contain;\n  border-radius: 8px;\n  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);\n}\n\n.agents-image-preview-close {\n  position: absolute;\n  top: 10px;\n  right: 10px;\n  width: 28px;\n  height: 28px;\n  border-radius: 50%;\n  background: rgba(255, 255, 255, 0.9);\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 21;\n}\n\n.agents-image-preview-close::before,\n.agents-image-preview-close::after {\n  content: \"\";\n  position: absolute;\n  width: 14px;\n  height: 2px;\n  background: #2b2b34;\n  border-radius: 1px;\n}\n\n.agents-image-preview-close::before {\n  transform: rotate(45deg);\n}\n\n.agents-image-preview-close::after {\n  transform: rotate(-45deg);\n}\n\n.agents-message-attachments {\n  display: flex;\n  flex-direction: column;\n  margin-bottom: 4px;\n}\n\n.agents-chat-message-user .agents-message-attachments {\n  align-items: flex-end;\n}\n\n.agents-chat-images-row {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 4px;\n  margin-top: 4px;\n}\n\n.agents-chat-message-user .agents-chat-images-row {\n  justify-content: flex-end;\n}\n\n.zia-agents-send-button.disabled {\n  opacity: 0.4;\n  pointer-events: none;\n  cursor: not-allowed;\n}\n\n.agents-upload-preview {\n  display: flex;\n  gap: 8px;\n  flex-wrap: wrap;\n  max-height: 160px;\n  overflow-y: auto;\n  overflow-x: hidden;\n}\n\n.preview-wrapper {\n  position: relative;\n  width: 72px;\n  height: 72px;\n  overflow: hidden;\n  background: #f3f4f6;\n  border-radius: 8px;\n  box-shadow: 0 0 0 1px rgba(43, 43, 52, 0.08);\n}\n\n.preview-img {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n}\n\n.preview-close {\n  position: absolute;\n  top: 6px;\n  right: 6px;\n  width: 18px;\n  height: 18px;\n  border-radius: 50%;\n  background: rgba(0, 0, 0, 0.75);\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  box-shadow: 0px 0.67px 0.67px 0px #2B2B343D;\n}\n\n.preview-close::before {\n  content: \"\";\n  width: 26px;\n  height: 26px;\n  background-image: var(--sprite-icon-url);\n  background-position: -89px -151px;\n  scale: 0.5;\n  background-repeat: no-repeat;\n  background-size: auto;\n}\n\n.preview-overlay {\n  position: absolute;\n  inset: 0;\n  background: rgba(255, 255, 255, 0.6);\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}\n\n.preview-spinner {\n  width: 18px;\n  height: 18px;\n  border: 2px solid color-mix(in srgb, var(--agents-primary-color) 20%, transparent);\n  border-top-color: var(--agents-primary-color);\n  border-radius: 50%;\n  animation: previewSpin 0.8s linear infinite;\n}\n\n@keyframes previewSpin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n\n.agents-chat-file-doc-card {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  width: 210px;\n  height: 55px;\n  padding: 8px;\n  border-radius: 8px;\n  background: #fff;\n  box-shadow: 0 0 0 1px rgba(43, 43, 52, 0.08), 0 1px 3px rgba(43, 43, 52, 0.06);\n  position: relative;\n  overflow: hidden;\n  flex-shrink: 0;\n  margin: 4px;\n  transition: background-color 0.15s ease, box-shadow 0.15s ease;\n}\n\n.agents-upload-preview .agents-chat-file-doc-card:hover {\n  background-color: color-mix(in srgb, var(--agents-primary-color) 8%, white);\n  box-shadow: 0 0 0 1px color-mix(in srgb, var(--agents-primary-color) 50%, transparent), 0 1px 3px rgba(43, 43, 52, 0.06);\n}\n\n.agents-upload-preview .agents-chat-file-doc-name {\n  max-width: 135px;\n}\n\n.agents-chat-file-icon {\n  background-image: var(--sprite-icons-url);\n  background-repeat: no-repeat;\n  display: inline-block;\n  vertical-align: middle;\n  flex-shrink: 0;\n  width: 20px;\n  height: 24px;\n  transform: scale(1.5);\n  margin-left: 6px;\n}\n\n.agents-chat-file-icon-pdf {\n  background-position: -1130px -20px;\n}\n\n.agents-chat-file-icon-ppt {\n  background-position: -1174px -20px;\n}\n\n.agents-chat-file-icon-pptx {\n  background-position: -1218px -20px;\n}\n\n.agents-chat-file-icon-csv {\n  background-position: -1262px -20px;\n}\n\n.agents-chat-file-icon-xls {\n  background-position: -1306px -20px;\n}\n\n.agents-chat-file-icon-xlsx {\n  background-position: -1350px -20px;\n}\n\n.agents-chat-file-icon-wav {\n  background-position: -1394px -20px;\n}\n\n.agents-chat-file-icon-mp3 {\n  background-position: -1438px -20px;\n}\n\n.agents-chat-file-icon-ai {\n  background-position: -1482px -20px;\n}\n\n.agents-chat-file-icon-doc {\n  background-position: -1526px -20px;\n}\n\n.agents-chat-file-icon-docx {\n  background-position: -1570px -20px;\n}\n\n.agents-chat-file-icon-psd {\n  background-position: -1614px -20px;\n}\n\n.agents-chat-file-icon-mp4 {\n  background-position: -1130px -64px;\n}\n\n.agents-chat-file-icon-mpeg {\n  background-position: -1174px -64px;\n}\n\n.agents-chat-file-icon-avi {\n  background-position: -1218px -64px;\n}\n\n.agents-chat-file-icon-mkv {\n  background-position: -1262px -64px;\n}\n\n.agents-chat-file-icon-zip {\n  background-position: -1306px -64px;\n}\n\n.agents-chat-file-icon-rar {\n  background-position: -1350px -64px;\n}\n\n.agents-chat-file-icon-txt {\n  background-position: -1394px -64px;\n}\n\n.agents-chat-file-icon-png {\n  background-position: -1438px -64px;\n}\n\n.agents-chat-file-icon-svg {\n  background-position: -1482px -64px;\n}\n\n.agents-chat-file-icon-img {\n  background-position: -1526px -64px;\n}\n\n.agents-chat-file-icon-fig {\n  background-position: -1570px -64px;\n}\n\n.agents-chat-file-icon-jpg,\n.agents-chat-file-icon-jpeg {\n  background-position: -1614px -64px;\n}\n\n.agents-chat-file-icon-aep {\n  background-position: -1130px -108px;\n}\n\n.agents-chat-file-icon-indd {\n  background-position: -1174px -108px;\n}\n\n.agents-chat-file-doc-info {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  overflow: hidden;\n  flex: 1;\n}\n\n.agents-chat-file-doc-name {\n  font-size: 14px;\n  font-weight: 500;\n  color: #111827;\n  line-height: 20px;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.agents-chat-file-doc-meta {\n  font-size: 12px;\n  color: #7E8091;\n  line-height: 20px;\n  white-space: nowrap;\n  display: flex;\n  align-items: center;\n  gap: 4px;\n}</style>",
_dynamicNodes : [{"type":"attr","position":[1]},{"type":"attr","position":[1,1]},{"type":"attr","position":[1,1,1]},{"type":"if","position":[1,1,1],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0,1,1]},{"type":"if","position":[0,1,1],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0]}]},"false":{"dynamicNodes":[{"type":"attr","position":[0]},{"type":"if","position":[0],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0]}]},"false":{"dynamicNodes":[]}},"default":{}}]}},"default":{}},{"type":"text","position":[0,1,3,0]},{"type":"attr","position":[0,3,1]},{"type":"attr","position":[0,3,1,1]},{"type":"attr","position":[0,3,3]}]},"false":{"dynamicNodes":[{"type":"attr","position":[0,1]}]}},"default":{}},{"type":"attr","position":[1,1,3]},{"type":"if","position":[1,1,3],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0]},{"type":"text","position":[0,1]}]}},"default":{}},{"type":"attr","position":[1,1,5]},{"type":"if","position":[1,1,5],"cases":{"true":{"dynamicNodes":[]},"false":{"dynamicNodes":[{"type":"attr","position":[0]},{"type":"if","position":[0],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0,7,3]},{"type":"attr","position":[0,7,7]},{"type":"if","position":[0,7,7],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0]}]},"false":{"dynamicNodes":[{"type":"attr","position":[0,1]},{"type":"if","position":[0,1],"cases":{"true":{"dynamicNodes":[]},"false":{"dynamicNodes":[]}},"default":{}}]}},"default":{}}]},"false":{"dynamicNodes":[{"type":"attr","position":[0,1,1]},{"type":"for","position":[0,1,1],"dynamicNodes":[{"type":"attr","position":[0]},{"type":"attr","position":[0,1]},{"type":"if","position":[0,1],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0]}]},"false":{"dynamicNodes":[{"type":"attr","position":[0]},{"type":"if","position":[0],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0]}]}},"default":{}}]}},"default":{}},{"type":"attr","position":[0,3]},{"type":"if","position":[0,3],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0,1]},{"type":"for","position":[0,1],"dynamicNodes":[{"type":"attr","position":[0,1]},{"type":"if","position":[0,1],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0]},{"type":"attr","position":[0,1]},{"type":"text","position":[0,3,1,0]},{"type":"text","position":[0,3,3,1,0]},{"type":"text","position":[0,3,3,5,0]}]}},"default":{}}]},{"type":"attr","position":[0,3,1]},{"type":"for","position":[0,3,1],"dynamicNodes":[{"type":"attr","position":[0,1]},{"type":"if","position":[0,1],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0]}]}},"default":{}}]}]}},"default":{}},{"type":"attr","position":[0,5]},{"type":"attr","position":[0,5,1]},{"type":"if","position":[0,5,1],"cases":{"true":{"dynamicNodes":[{"type":"text","position":[0,1]}]}},"default":{}},{"type":"attr","position":[0,7]},{"type":"if","position":[0,7],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0]},{"type":"text","position":[0,1,1,0]}]}},"default":{}},{"type":"attr","position":[0,9]},{"type":"if","position":[0,9],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0]},{"type":"text","position":[0,1]}]}},"default":{}}]},{"type":"attr","position":[0,1,3]},{"type":"if","position":[0,1,3],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0,1]},{"type":"if","position":[0,1],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0]}]},"false":{"dynamicNodes":[{"type":"attr","position":[0]},{"type":"if","position":[0],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0]}]}},"default":{}}]}},"default":{}},{"type":"text","position":[0,5,1]}]}},"default":{}},{"type":"attr","position":[0,3,1]},{"type":"if","position":[0,3,1],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0,1]},{"type":"for","position":[0,1],"dynamicNodes":[{"type":"attr","position":[0,1]},{"type":"if","position":[0,1],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0]},{"type":"attr","position":[0,1]},{"type":"if","position":[0,1],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0]}]}},"default":{}},{"type":"attr","position":[0,3]},{"type":"if","position":[0,3],"cases":{"true":{"dynamicNodes":[]}},"default":{}},{"type":"attr","position":[0,5]},{"type":"if","position":[0,5],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0]}]}},"default":{}}]},"false":{"dynamicNodes":[{"type":"attr","position":[0]},{"type":"attr","position":[0,1]},{"type":"text","position":[0,3,1,0]},{"type":"attr","position":[0,3,3]},{"type":"if","position":[0,3,3],"cases":{"true":{"dynamicNodes":[]},"false":{"dynamicNodes":[{"type":"text","position":[0,1,0]},{"type":"text","position":[0,5,0]}]}},"default":{}},{"type":"attr","position":[0,5]},{"type":"if","position":[0,5],"cases":{"true":{"dynamicNodes":[]}},"default":{}},{"type":"attr","position":[0,7]},{"type":"if","position":[0,7],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0]}]}},"default":{}}]}},"default":{}}]}]}},"default":{}},{"type":"attr","position":[0,3,3,1]},{"type":"if","position":[0,3,3,1],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0]},{"type":"attr","position":[0,1]}]}},"default":{}},{"type":"attr","position":[0,3,3,3],"attr":{"placeholder":{"name":"placeholder","dynamicValue":"inputPlaceholder"}}},{"type":"attr","position":[0,3,3,5]}]}},"default":{}}]}},"default":{}},{"type":"attr","position":[1,1,9]},{"type":"if","position":[1,1,9],"cases":{"true":{"dynamicNodes":[{"type":"attr","position":[0,1]},{"type":"attr","position":[0,3]}]}},"default":{}},{"type":"attr","position":[3]},{"type":"attr","position":[3,1]},{"type":"if","position":[3,1],"cases":{"true":{"dynamicNodes":[]},"false":{"dynamicNodes":[{"type":"attr","position":[0]},{"type":"if","position":[0],"cases":{"true":{"dynamicNodes":[]},"false":{"dynamicNodes":[{"type":"attr","position":[0]},{"type":"if","position":[0],"cases":{"true":{"dynamicNodes":[]},"false":{"dynamicNodes":[{"type":"attr","position":[0]},{"type":"if","position":[0],"cases":{"true":{"dynamicNodes":[]}},"default":{}}]}},"default":{}}]}},"default":{}}]}},"default":{}}],
_observedAttributes :["config","jwtToken","sessionId","agentUserChatHistory","agentHeaderName","waitingForAgentResponse","multiAgent","showSdkKeyCard","sdkAuthLoading","sdkAlertMsg","sdkAlertType","reauthTried","reauthInProgress","lastUserMessage","sdkKeyValue","initFailed","initCompleted","isWebChatAttachmentEnabled","supportedFileAttachments","fileAcceptTypes","fileDetails","canSendMessage","uploadState","chatDefaultOpen","customSessionId","welcomeMessage","inputPlaceholder","customColorTheme","customButton","customIconUrl","defaultAvatarUrl","previewImageUrl","previewImageName"],
_observedAttributesType :["object","string","string","array","string","boolean","boolean","boolean","boolean","string","string","boolean","boolean","string","boolean","boolean","boolean","boolean","array","string","array","boolean","string","boolean","string","string","string","string","number","string","string","string","string"],

	data: function () {
		return {
			config: Lyte.attr("object", { default: {} }),
			jwtToken: Lyte.attr("string", { default: "" }),
			sessionId: Lyte.attr("string", { default: "" }),
			agentUserChatHistory: Lyte.attr("array", { default: [] }),
			agentHeaderName: Lyte.attr("string", { default: "Assistance" }),
			waitingForAgentResponse: Lyte.attr('boolean', { default: false }),
			multiAgent: Lyte.attr('boolean', { default: false }),
			showSdkKeyCard: Lyte.attr("boolean", { default: false }),
			sdkAuthLoading: Lyte.attr("boolean", { default: false }),
			sdkAlertMsg: Lyte.attr("string", { default: "" }),
			sdkAlertType: Lyte.attr("string", { default: "" }),
			reauthTried: Lyte.attr("boolean", { default: false }),
			reauthInProgress: Lyte.attr("boolean", { default: false }),
			lastUserMessage: Lyte.attr("string", { default: "" }),
			sdkKeyValue: Lyte.attr("boolean", { default: false }),
			initFailed: Lyte.attr("boolean", { default: false }),
			initCompleted: Lyte.attr("boolean", { default: false }),
			isWebChatAttachmentEnabled: Lyte.attr("boolean", { default: false }),
			supportedFileAttachments: Lyte.attr("array", { default: [] }),
			fileAcceptTypes: Lyte.attr("string", { default: "" }),
			fileDetails: Lyte.attr("array", { default: [] }),
			canSendMessage: Lyte.attr("boolean", { default: false }),
			uploadState: Lyte.attr("string", { default: "" }),
			chatDefaultOpen: Lyte.attr("boolean", { default: true }),
			customSessionId: Lyte.attr("string", { default: "" }),
			welcomeMessage: Lyte.attr("string", { default: "Hi there! I am Zia Agents, Ask me about anything." }),
			inputPlaceholder: Lyte.attr("string", { default: "Send message..." }),
			customColorTheme: Lyte.attr("string", { default: "" }),
			customButton: Lyte.attr("number", { default: 1 }),
			customIconUrl: Lyte.attr("string", { default: "" }),
			defaultAvatarUrl: Lyte.attr("string", { default: "" }),
			previewImageUrl: Lyte.attr("string", { default: "" }),
			previewImageName: Lyte.attr("string", { default: "" })
		};
	},

	getSdkAssetsBaseUrl: function () {
		let scripts = document.querySelectorAll("script");
		let sdkReg = /agents-chat-sdk\.js(\?.*)?$/;
		let compReg = /agents-chat-bot-comp\.js(\?.*)?$/;
		for (let i = 0; i < scripts.length; i++) {
			let src = (scripts[i].src || "").toString();
			if (sdkReg.test(src)) {
				return src.replace(/\/assets\/js\/agents-chat-sdk\.js(\?.*)?$/, "");
			}
		}
		for (let i = 0; i < scripts.length; i++) {
			let src = (scripts[i].src || "").toString();
			if (compReg.test(src)) {
				return src.replace(/\/components\/javascript\/agents-chat-bot-comp\.js(\?.*)?$/, "");
			}
		}
		return "";
	},

	computeDefaultAvatarUrl: function (name, type, size) {
		type = type || 'agents';
		size = size || 'small';

		let bgClassList = [];

		let num = (type == 'agents') ? 22 : (type == 'multi-agents') ? 15 : 0;
		for (let i = 1; i <= num; i++) {
			let img = i < 10 ? "0" + i : i;
			bgClassList.push(img + '.png');
		}

		const hash = (n) => {
			let h = 0;
			if (!n) {
				return h;
			}
			for (let i = 0; i < n.length; i++) {
				h = n.charCodeAt(i) + ((h << 5) - h);
			}
			return Math.abs(h);
		};
		const index = hash(name) % bgClassList.length;

		var sizeFolder = size === 'small' ? '92' : '140';

		let hasIntegrateComp = !!$L("agent-integrate-comp")[0]?.component;
		let base = hasIntegrateComp ? '/resources/addon-chat' : this.getSdkAssetsBaseUrl();
		return base + '/assets/images/avatar/' + type + '/' + sizeFolder + '/' + bgClassList[index];
	},

	init: function () {
		let hasIntegrateComp = !!$L("agent-integrate-comp")[0]?.component;
		let tag = document.querySelector("agents-chat-bot-comp");
		let rawAttribute = tag && tag.getAttribute("ziaAgents");
		let parsed = {};

		if (rawAttribute) {
			try {
				parsed = Function("return (" + rawAttribute + ")")();
			} catch (e) { }
		}

		if (!parsed?.url) {
			if (typeof ziaagents !== "undefined" && ziaagents.url) {
				parsed = { ...parsed, url: ziaagents.url || "" };
			}
		}

		if (parsed.openChatOnInit === false) {
			this.setData("chatDefaultOpen", false);
		}

		if (parsed.customSessionId && this.isValidCustomSessionId(parsed.customSessionId)) {
			this.setData("customSessionId", parsed.customSessionId);
		}

		this.setData("config", parsed);

		if (hasIntegrateComp) {
			this.defaultInit();

			return;
		}

		if (!parsed?.orgId || !parsed?.entityId || !parsed?.url) {
			return;
		}

		let initUrl = parsed.url + "/ziaagents/api/v1/chatsdk/webchat/init";
		let initDataPromise;
		if (typeof ziaagents !== "undefined" && ziaagents.initialSystemData) {
			initDataPromise = ziaagents.initialSystemData;
		} else {
			initDataPromise = fetch(initUrl, {
				method: "GET",
				headers: {
					"X-ZIAAGENTS-ORG": parsed.orgId || "",
					"X-ZIAAGENTS-CHATSDK-DEPLOYMENT-ID": parsed.entityId || ""
				}
			})
				.then(response => {
					if (!response.ok) {
						throw new Error();
					}
					return response.json();
				});
		}

		initDataPromise.then(result => {
			let data = result?.data || {};
			if (data) {
				let headerName = data?.customName || data?.webChatEntityName || parsed.agentHeaderName || "Assistance";
				let updatedConfig = {
					...parsed,
					isMultiAgent: data?.webChatEntityType == "AGENT" ? false : true,
					isSdkPrivate: data?.webChatEntityAccessType == 1 ? true : false,
					isWebChatAttachmentEnabled: data?.isWebChatAttachmentEnabled,
					agentHeaderName: headerName
				};

				this.setData("config", updatedConfig);

				let initDataUpdate = {
					agentHeaderName: headerName,
					initFailed: false
				};

				if (updatedConfig.isMultiAgent !== undefined) {
					initDataUpdate.multiAgent = updatedConfig.isMultiAgent;
				}

				if (updatedConfig.isWebChatAttachmentEnabled !== undefined) {
					initDataUpdate.isWebChatAttachmentEnabled = updatedConfig.isWebChatAttachmentEnabled;
				}

				let supportedFileAttachments = Array.isArray(data?.supportedFileAttachments) && data.supportedFileAttachments.length ? data.supportedFileAttachments : []; //No I18N
				initDataUpdate.supportedFileAttachments = supportedFileAttachments; //No I18N
				initDataUpdate.fileAcceptTypes = supportedFileAttachments.join(","); //No I18N

				if (data?.customWelcomeMessage) {
					initDataUpdate.welcomeMessage = data.customWelcomeMessage;
				}

				if (data?.customMessageBox) {
					initDataUpdate.inputPlaceholder = data.customMessageBox;
				}

				if (data?.customColorTheme) {
					initDataUpdate.customColorTheme = data.customColorTheme;
				}

				if (data?.customButton !== undefined) {
					initDataUpdate.customButton = data.customButton || 1;
				} else {
					initDataUpdate.customButton = 1;
				}

				if (data?.customIconUrl) {
					initDataUpdate.customIconUrl = data.customIconUrl;
					document.documentElement.style.setProperty("--agents-bot-avatar", `url("${data.customIconUrl}")`);
				} else {
					let avatarName = data?.webChatEntityName || data?.customName || "Assistance";
					let avatar = this.computeDefaultAvatarUrl(avatarName, updatedConfig.isMultiAgent ? 'multi-agents' : 'agents', 'medium');
					initDataUpdate.defaultAvatarUrl = avatar;
					document.documentElement.style.setProperty("--agents-bot-avatar", `url("${avatar}")`);
				}

				if (data?.chatOpenByDefault !== undefined) {
					initDataUpdate.chatDefaultOpen = data.chatOpenByDefault !== false;
				}

				let themeColor = data?.customColorTheme || "#6B4EFF";
				document.documentElement.style.setProperty("--agents-primary-color", themeColor);

				this.setData(initDataUpdate);
				this.setData("initCompleted", true);
			} else {
				this.setData("initFailed", true);
				this.setData("initCompleted", true);
			}
		})
			.catch(() => {
				this.setData({
					initFailed: true,
					initCompleted: true
				});
			})
	},

	didConnect: function () {
		let hasIntegrateComp = !!$L("agent-integrate-comp")[0]?.component;
		if (!hasIntegrateComp) {
			if (!this.getData("initCompleted")) {
				return;
			}

			if (this.getData("initFailed")) {
				return;
			}
		}
		let chatConfig = this.data.config || {};
		let isPrivate = chatConfig.isSdkPrivate === true || chatConfig.isSdkPrivate === "true";

		if (isPrivate && !hasIntegrateComp) {
			this.setData("showSdkKeyCard", true);
			return;
		}

		if (isPrivate && typeof ziaagents !== "undefined" && ziaagents.authAuthentication) {
			ziaagents.authAuthentication(chatConfig)
				.then(token => this.setData("jwtToken", token));
		}

		this.bindInputEvents();
		this.executeMethod("addMessage", "bot", this.data.welcomeMessage, null, true);
	},

	initObserver: function () {
		if (!this.data.initCompleted || this.data.initFailed) {
			return;
		}

		let chatConfig = this.data.config || {};
		let isPrivate = chatConfig.isSdkPrivate === true || chatConfig.isSdkPrivate === "true";
		let hasIntegrateComp = !!$L("agent-integrate-comp")[0]?.component;

		if (isPrivate && !hasIntegrateComp) {
			this.setData("showSdkKeyCard", true);
			return;
		}

		if (isPrivate && typeof ziaagents !== "undefined" && ziaagents.authAuthentication) {
			ziaagents.authAuthentication(chatConfig)
				.then(token => this.setData("jwtToken", token));
		}

		this.bindInputEvents();
		this.executeMethod("addMessage", "bot", this.data.welcomeMessage, null, true);

	}.observes("initCompleted"),

	actions: {
		openImagePreview: function (url, name) {
			if (!url) return;
			this.setData({ previewImageUrl: url, previewImageName: name || "" });
		},

		closeImagePreview: function () {
			this.setData({ previewImageUrl: "", previewImageName: "" });
		},

		removeUploadedFile: function (index) {
			let files = this.getData("fileDetails") || [];
			let file = files[index];
			if (file?.previewUrl) {
				URL.revokeObjectURL(file.previewUrl);
			}
			Lyte.arrayUtils(files, "removeAt", index, 1);
			let anyUploading = files.some(function (fileItem) { return fileItem.uploadState === "uploading"; });
			if (!anyUploading) {
				this.setData("uploadState", "");
			}
		},

		handleFileUpload: function () {
			let hasIntegrateComp = !!$L("agent-integrate-comp")[0]?.component;
			let fileInput = this.$node.querySelector(".agents-chat-file-input");
			if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
				return;
			}

			let existingFiles = this.getData("fileDetails") || [];
			let allowedTypes = this.getData("fileAcceptTypes").split(",");
			let newFiles = Array.from(fileInput.files);
			let availableSlots = 3 - existingFiles.length;

			if (availableSlots <= 0) {
				fileInput.value = "";
				return;
			}

			newFiles = newFiles.slice(0, availableSlots);

			let chatConfig = this.data.config || {};
			let token = this.getData("jwtToken");
			let isPrivate = chatConfig.isSdkPrivate === true || chatConfig.isSdkPrivate === "true";

			let attachmentUrl;
			let headers = {};

			if (hasIntegrateComp) {
				attachmentUrl = `/ziaagents/api/v1/files`; //No I18N
				headers["X-ZIAAGENTS-ORG"] = chatConfig.orgId || ""; //No I18N
				let csrfToken = document.cookie.split("; ").find(row => row.startsWith("ziaagentscsr="))?.split("=")[1]; //No I18N
				if (csrfToken) {
					headers["X-ZCSRF-TOKEN"] = "ziaagentscsrfparam=" + csrfToken; //No I18N
				}
			} else {
				if (!chatConfig.url) return;
				attachmentUrl = chatConfig.url + `/ziaagents/api/v1/chatsdk/webchat/attachment`; //No I18N
				headers["X-ZIAAGENTS-CHATSDK-DEPLOYMENT-ID"] = chatConfig.entityId || ""; //No I18N
				headers["X-ZIAAGENTS-ORG"] = chatConfig.orgId || ""; //No I18N
				if (isPrivate && token) {
					headers["Authorization"] = "Bearer " + token; //No I18N
				}
			}

			newFiles.forEach(file => {
				if (!allowedTypes.includes(file.type)) {
					let supportedMimes = this.getData("supportedFileAttachments") || []; //No I18N
					this.showSdkAlert("Only " + supportedMimes.map(m => m.split("/").pop().toUpperCase()).join(", ") + " files are allowed", "error"); //No I18N
					return;
				}

				let isImageFile = ["image/png", "image/jpeg", "image/jpg"].includes(file.type);
				let maxSize = isImageFile ? 500 * 1024 : 5 * 1024 * 1024;
				let maxLabel = isImageFile ? "500 KB" : "5 MB";
				if (file.size > maxSize) {
					this.showSdkAlert("File size must be under " + maxLabel, "error");
					return;
				}

				let fileExtension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
				let fileExtensionLabel = fileExtension.toUpperCase();
				let fileSizeLabel = this.formatFileSize(file.size);

				let currentFiles = this.getData("fileDetails") || [];
				let uniqueId = Date.now() + "_" + Math.random();
				Lyte.arrayUtils(currentFiles, "insertAt", currentFiles.length, {
					_uid: uniqueId,
					name: file.name,
					size: file.size,
					type: file.type,
					isImageFile: isImageFile,
					fileExtension: fileExtension,
					fileExtensionLabel: fileExtensionLabel,
					fileSizeLabel: fileSizeLabel,
					uploadState: "uploading"
				});
				this.setData("uploadState", "uploading");

				let formData = new FormData();
				formData.append("file", file);
				if (hasIntegrateComp) {
					formData.append("fileName", file.name);
				}

				fetch(attachmentUrl, {
					method: "POST",
					headers: headers,
					body: formData
				})
					.then(response => {
						if (!response.ok) throw new Error();
						return response.json();
					})
					.then(response => {
						let fileId = response?.data?.fileId;
						if (!fileId) throw new Error();

						let previewUrl = isImageFile ? URL.createObjectURL(file) : null;
						let currentFiles = this.getData("fileDetails") || [];
						let fileIndex = currentFiles.findIndex(function (fileItem) { return fileItem._uid === uniqueId; });
						if (fileIndex !== -1) {
							Lyte.arrayUtils(currentFiles, "removeAt", fileIndex, 1);
							Lyte.arrayUtils(currentFiles, "insertAt", fileIndex, {
								_uid: uniqueId,
								fileId: fileId,
								name: response.data.fileName || file.name,
								size: response.data.fileSize || file.size,
								type: response.data.mimeType || file.type,
								isImageFile: isImageFile,
								fileExtension: fileExtension,
								fileExtensionLabel: fileExtensionLabel,
								fileSizeLabel: fileSizeLabel,
								previewUrl: previewUrl,
								uploadState: "success"
							});
						}
						let anyUploading = (this.getData("fileDetails") || []).some(function (fileItem) { return fileItem.uploadState === "uploading"; });
						if (!anyUploading) {
							this.setData("uploadState", "success");
						}
					})
					.catch(() => {
						let currentFiles = this.getData("fileDetails") || [];
						let fileIndex = currentFiles.findIndex(function (fileItem) { return fileItem._uid === uniqueId; });
						if (fileIndex !== -1) {
							Lyte.arrayUtils(currentFiles, "removeAt", fileIndex, 1);
						}
						let anyUploading = (this.getData("fileDetails") || []).some(function (fileItem) { return fileItem.uploadState === "uploading"; });
						if (!anyUploading) {
							this.setData("uploadState", "");
						}
					});
			});

			fileInput.value = "";
		},

		submitSdkKey: function () {
			if (!this.getData("sdkKeyValue")) {
				return;
			}
			let input = this.$node.querySelector(".agents-sdk-input");
			let key = input && input.value.trim();
			if (!key) return;

			this.setData("sdkAuthLoading", true);

			let chatConfig = this.getData("config") || {};
			chatConfig.sskKey = key;
			this.setData("config", chatConfig);

			let authPromise;

			if (typeof ziaagents !== "undefined" && ziaagents.authAuthentication) {
				authPromise = ziaagents.authAuthentication(chatConfig);
			} else {
				authPromise = this.fetchJwtToken(chatConfig);
			}

			authPromise
				.then((token) => {
					this.showSdkAlert("Valid Chat key", "success");
					this.setData({ "showSdkKeyCard": false, "sdkAuthLoading": false, "jwtToken": token });
					this.bindInputEvents();
					this.setData("sdkKeyValue", false);
					this.executeMethod("addMessage", "bot", this.data.welcomeMessage, null, true);
					if (input) {
						input.value = "";
					}
				})
				.catch(() => {
					this.setData({ "sdkAuthLoading": false, "sdkKeyValue": false });
					this.showSdkAlert("Invalid Chat Key", "error");
					if (input) {
						input.value = "";
					}
				});
		},

		sendMessage: function (lastUserMessage) {
			let isRetry = typeof lastUserMessage === "string" && lastUserMessage.trim();
			if (!isRetry && this.getData("waitingForAgentResponse")) return;

			let input = this.$node.querySelector(".agents-chat-text-input");
			if (!input) return;

			let agentsUserMessage = "";
			if (isRetry) {
				agentsUserMessage = lastUserMessage;
			} else {
				agentsUserMessage = input.value.trim();
			}
			if (!agentsUserMessage) return;
			if (this.data.uploadState === "uploading") { return; }

			input.value = "";
			input.style.height = "20px";

			this.setData("waitingForAgentResponse", true);
			requestAnimationFrame(() => {
				let body = this.$node.querySelector("#chatBody");
				if (body) {
					body.scrollTop = body.scrollHeight;
				}
			});

			let attachmentsForMessage = [];
			if (!isRetry) {
				(this.data.fileDetails || []).forEach(function (fileItem) {
					if (fileItem.fileId) {
						attachmentsForMessage.push({
							fileId: fileItem.fileId,
							name: fileItem.name,
							type: fileItem.type,
							isImageFile: fileItem.isImageFile,
							fileExtension: fileItem.fileExtension,
							fileExtensionLabel: fileItem.fileExtensionLabel,
							fileSize: fileItem.fileSizeLabel,
							previewUrl: fileItem.previewUrl
						});
					}
				});

				this.executeMethod("addMessage", "user", agentsUserMessage, attachmentsForMessage);
				this.setData("lastUserMessage", agentsUserMessage);
			}

			if (typeof ziaagents !== "undefined" && typeof ziaagents.customeExcution === "function") {
				try {
					let customResult = ziaagents.customeExcution(agentsUserMessage, attachmentsForMessage);
					this.setData("fileDetails", []);

					if (customResult && typeof customResult.then === "function") {
						customResult.then(responseText => {
							if (responseText) {
								this.executeMethod("addMessage", "bot", responseText);
							}
						}).catch(() => {
							this.executeMethod("addMessage", "bot", "Sorry, Something went wrong.");
						}).finally(() => {
							this.setData("waitingForAgentResponse", false);
						});
					} else if (customResult) {
						this.setData("waitingForAgentResponse", false);
						this.executeMethod("addMessage", "bot", customResult);
					}

					return;
				} catch (e) {
					this.setData("waitingForAgentResponse", false);
					this.executeMethod("addMessage", "bot", "Sorry, Something went wrong.");
					return;
				}
			} else if ($L("agent-integrate-comp")[0]?.component) {
				try {
					let integrateComp = $L("agent-integrate-comp")[0].component;
					let customResult = integrateComp.fetchAgentQuery(agentsUserMessage, attachmentsForMessage);
					this.setData("fileDetails", []);

					if (customResult && typeof customResult.then === "function") {
						customResult.then(responseText => {
							let integrateSessionId = integrateComp.getData("sessionId");
							if (integrateSessionId) {
								this.setData("sessionId", integrateSessionId);
							}
							if (responseText) {
								this.executeMethod("addMessage", "bot", responseText);
							}
						})
							.catch(() => {
								this.executeMethod("addMessage", "bot", "Sorry, Something went wrong.");
							})
							.finally(() => {
								this.setData("waitingForAgentResponse", false);
							});
					} else if (customResult) {
						this.executeMethod("addMessage", "bot", customResult);
						this.setData("waitingForAgentResponse", false);
					}

					return;
				} catch (e) {
					this.setData("waitingForAgentResponse", false);
					this.executeMethod("addMessage", "bot", "Sorry, Something went wrong.");
					return;
				}
			}

			let chatConfig = this.data.config || {};
			let isPrivate = chatConfig.isSdkPrivate === true || chatConfig.isSdkPrivate === "true";
			let token = this.getData("jwtToken");

			if (!chatConfig.url || (isPrivate && !token)) {
				this.setData("waitingForAgentResponse", false);
				this.executeMethod("addMessage", "bot", "Authentication Failed...");
				return;
			}

			let attachments = [];
			(this.data.fileDetails || []).forEach(function (fileItem) {
				if (fileItem.fileId) attachments.push(fileItem.fileId);
			});
			this.setData({ "uploadState": "", "fileDetails": [] });

			if (this.data.multiAgent) {
				let queryUrl = chatConfig.url + "/ziaagents/api/v1/chatsdk/workflows/webchat/query";
				let statusUrl = chatConfig.url + "/ziaagents/api/v1/chatsdk/workflows/webchat/query/status";

				const MAX_POLLS = 200;
				let pollCount = 0;

				let headers;
				if (isPrivate) {
					headers = {
						"Content-Type": "application/json",
						"Authorization": "Bearer " + token,
						"X-ZIAAGENTS-CHATSDK-DEPLOYMENT-ID": chatConfig.entityId || "",
						"X-ZIAAGENTS-ORG": chatConfig.orgId || ""
					};
				} else {
					headers = {
						"Content-Type": "application/json",
						"X-ZIAAGENTS-CHATSDK-DEPLOYMENT-ID": chatConfig.entityId || "",
						"X-ZIAAGENTS-ORG": chatConfig.orgId || ""
					};
				}

				let component = this;
				const poll = (executionId) => {
					if (pollCount++ >= MAX_POLLS) {
						throw new Error("Something went wrong");
					}

					return fetch(statusUrl, {
						method: "GET",
						headers: {
							...headers,
							"X-ZIAAGENTS-WORKFLOW-EXECUTION-ID": executionId
						}
					})
						.then(response => response.json())
						.then(result => {
							if (result?.data?.status === "success") {
								let parsed = {};
								try {
									parsed = JSON.parse(result?.data?.response);
								} catch (e) { }

								let reply = parsed?.success?.response || "No response";

								if (typeof marked !== "undefined") {
									reply = marked.parse(reply);
								}
								return reply;
							}

							if (result?.data?.status === "error" || result?.data?.status === "failed") {
								throw new Error("Something went wrong");
							}

							if (result?.data?.status === "inprogress" && result?.data?.response) {
								component.setData("multiAgentsPoolsMessage", result?.data?.response)
							}

							return new Promise(resolve =>
								setTimeout(() => resolve(poll(executionId)), 3000)
							);
						});
				};

				let sessionId = this?.data?.sessionId;
				let customSessionId = this.data.customSessionId;
				fetch(queryUrl, {
					method: "POST",
					headers: {
						...headers,
						"X-ZIAAGENTS-ASYNC": true,
						...(customSessionId
							? { "X-ZIAAGENTS-WORKFLOW-CUSTOM-SESSION-ID": customSessionId }
							: sessionId
								? { "X-ZIAAGENTS-WORKFLOW-SESSION-ID": sessionId }
								: {})
					},
					body: JSON.stringify({
						query: agentsUserMessage,
						...(attachments.length ? { attachments: attachments } : {})
					})
				})
					.then(response => response.json())
					.then(result => {
						if (!result?.data?.executionId) {
							throw new Error("Invalid workflow execution id");
						}
						this.setData("sessionId", result?.data?.workflowSessionId);
						return poll(result?.data?.executionId);
					})
					.then(reply => {
						this.executeMethod("addMessage", "bot", reply);
						this.setData({ "fileDetails": [], "reauthTried": false, "waitingForAgentResponse": false });
						this.updateSendState();
					})
					.catch(() => {
						if (isPrivate && !this.data.reauthTried) {
							this.tryReAuthOnce()
								.then(() => {
									this.actions.sendMessage.call(this, this.getData("lastUserMessage"));
								})
								.catch(() => {
									this.executeMethod("addMessage", "bot", "Session expired. Please refresh.");
									this.setData("waitingForAgentResponse", false);
								});
							return;
						}

						this.setData("waitingForAgentResponse", false);
						this.executeMethod("addMessage", "bot", "Sorry, Something went wrong.");
						this.updateSendState();
					});

				return;
			} else {
				let url = chatConfig.url + "/ziaagents/api/v1/chatsdk/agents/webchat/query";

				let headers;
				if (isPrivate) {
					headers = {
						"Content-Type": "application/json",
						"Authorization": "Bearer " + token,
						"X-ZIAAGENTS-CHATSDK-DEPLOYMENT-ID": chatConfig.entityId || "",
						"X-ZIAAGENTS-ORG": chatConfig.orgId || "",
						"X-ZIAAGENTS-SYNC-UNTIL": "120000"
					};
				} else {
					headers = {
						"Content-Type": "application/json",
						"X-ZIAAGENTS-CHATSDK-DEPLOYMENT-ID": chatConfig.entityId || "",
						"X-ZIAAGENTS-ORG": chatConfig.orgId || "",
						"X-ZIAAGENTS-SYNC-UNTIL": "120000"
					};
				}

				if (this.data.customSessionId) {
					headers["X-ZIAAGENTS-AGENT-CUSTOM-SESSION-ID"] = this.data.customSessionId;
				} else if (this.data.sessionId) {
					headers["X-ZIAAGENTS-AGENT-SESSION-ID"] = this.data.sessionId;
				}

				fetch(url, {
					method: "POST",
					headers: headers,
					body: JSON.stringify({
						query: agentsUserMessage,
						...(attachments.length ? { attachments: attachments } : {})
					})
				})
					.then(response => response.json())
					.then(result => {
						if (result?.data?.sessionId) {
							this.setData("sessionId", result.data.sessionId);
						}

						let reply =
							result?.data?.response ||
							result?.response ||
							result?.message ||
							"No response";

						let finalMessage = reply;
						try {
							if (typeof marked !== "undefined") {
								finalMessage = marked.parse(reply);
							}
						} catch (e) {
							finalMessage = reply;
						}

						this.setData("waitingForAgentResponse", false);
						this.executeMethod("addMessage", "bot", finalMessage);
						this.setData({ "fileDetails": [], "reauthTried": false });
						this.updateSendState();
					})
					.catch(() => {
						if (isPrivate && !this.data.reauthTried) {
							this.tryReAuthOnce()
								.then(() => {
									this.actions.sendMessage.call(this, this.getData("lastUserMessage"));
								})
								.catch(() => {
									this.executeMethod("addMessage", "bot", "Session expired. Please refresh.");
									this.setData("waitingForAgentResponse", false);
								});
							return;
						}

						this.setData("waitingForAgentResponse", false);
						this.executeMethod("addMessage", "bot", "Sorry, Something went wrong.");
						this.updateSendState();
					});
			}
		},

		toggleAgentsChat: function () {
			this.setData("chatDefaultOpen", !this.data.chatDefaultOpen);
		},

		onSdkKeyInput: function () {
			let input = this.$node.querySelector(".agents-sdk-input");
			this.setData("sdkKeyValue", !!input && !!input.value.trim());
		},

		resetChat: function () {
			let sessionId = this.getData("sessionId");
			if (!sessionId) {
				return;
			}

			if (this._typingTimer) {
				clearTimeout(this._typingTimer);
				this._typingTimer = null;
				this._typingTarget = null;
			}

			let integrateComp = $L("agent-integrate-comp")[0]?.component;
			if (integrateComp) {
				integrateComp.setData("sessionId", "");
				if (integrateComp.getData("isPollingActive")) {
					integrateComp.setData("isPollingActive", false);
				}
			}

			let history = this.getData("agentUserChatHistory");
			if (history && history.length) {
				Lyte.arrayUtils(history, "removeAt", 0, history.length);
			}

			let input = this.$node.querySelector(".agents-chat-text-input");
			if (input) {
				input.value = "";
				input.style.height = "20px";
			}

			let fileDetails = this.getData("fileDetails") || [];
			fileDetails.forEach(function (fileItem) {
				if (fileItem.previewUrl) {
					URL.revokeObjectURL(fileItem.previewUrl);
				}
			});

			this.setData({
				"sessionId": "",
				"waitingForAgentResponse": false,
				"lastUserMessage": "",
				"canSendMessage": false,
				"fileDetails": [],
				"uploadState": "",
				"sdkAlertMsg": "",
				"sdkAlertType": "",
				"reauthTried": false,
				"reauthInProgress": false,
				"multiAgentsPoolsMessage": ""
			});

			this.executeMethod("addMessage", "bot", this.data.welcomeMessage, null, true);
			this.showSdkAlert("Chat cleared successfully", "success");
		}

	},

	methods: {
		addMessage: function (sender, text, attachments, skipAnimation) {
			if (!text && (!attachments || !attachments.length)) return;

			if (typeof text === "string") {
				text = text.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
			}

			if (this._typingTimer) {
				clearTimeout(this._typingTimer);
				this._typingTimer = null;
				if (this._typingTarget) {
					Lyte.objectUtils(this._typingTarget.obj, "add", "message", this._typingTarget.fullText);
					this._typingTarget = null;
				}
			}

			let history = this.getData("agentUserChatHistory");

			let currentTime = new Date();
			let hours = currentTime.getHours();
			let minutes = currentTime.getMinutes().toString().padStart(2, "0");
			let ampm = hours >= 12 ? "PM" : "AM";
			hours = hours % 12 || 12;

			let displayText = (sender === "bot" && !skipAnimation) ? "" : text;
			if (sender === "user" && typeof text === "string" && text.indexOf("\n") !== -1) {
				let trimmedText = text.replace(/^\n+/, "").replace(/\n+$/, "");
				displayText = trimmedText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
			}

			let messageObj = {
				messagetype: sender,
				message: displayText,
				attachments: attachments || [],
				time: hours + ":" + minutes + " " + ampm
			};

			Lyte.arrayUtils(history, "insertAt", history.length, messageObj);

			if (sender === "bot" && text && !skipAnimation) {
				this.typeMessage(history[history.length - 1], text);
			}

			requestAnimationFrame(() => {
				let body = this.$node.querySelector("#chatBody");
				if (body) {
					body.scrollTo({
						top: body.scrollHeight,
						behavior: "smooth"
					});
				}
			});
		}
	},

	showSdkAlert: function (message, type) {
		this.setData({ "sdkAlertMsg": message, "sdkAlertType": type });

		setTimeout(() => {
			this.setData({ "sdkAlertMsg": "", "sdkAlertType": "" });
		}, 2000);
	},

	typeMessage: function (messageObj, fullHtml) {
		let index = 0;
		let currentText = "";
		let speed = 20;
		let component = this;
		let userScrolledUp = false;

		this._typingTarget = { obj: messageObj, fullText: fullHtml };

		let body = this.$node.querySelector("#chatBody");
		let onScroll = function () {
			if (body && body.scrollHeight - body.scrollTop - body.clientHeight > 10) {
				userScrolledUp = true;
			}
		};
		if (body) {
			body.addEventListener("scroll", onScroll);
		}

		let typeNext = function () {
			if (index >= fullHtml.length) {
				component._typingTimer = null;
				component._typingTarget = null;
				if (body) {
					body.removeEventListener("scroll", onScroll);
				}
				return;
			}

			let visibleChars = 0;
			let chunkEnd = index;

			while (visibleChars < 1 && chunkEnd < fullHtml.length) {
				if (fullHtml[chunkEnd] === "<") {
					let tagEnd = fullHtml.indexOf(">", chunkEnd);
					chunkEnd = tagEnd !== -1 ? tagEnd + 1 : chunkEnd + 1;
				} else if (fullHtml[chunkEnd] === "&") {
					let entityEnd = fullHtml.indexOf(";", chunkEnd);
					if (entityEnd !== -1 && entityEnd - chunkEnd < 10) {
						chunkEnd = entityEnd + 1;
					} else {
						chunkEnd++;
					}
					visibleChars++;
				} else {
					chunkEnd++;
					visibleChars++;
				}
			}

			currentText += fullHtml.substring(index, chunkEnd);
			index = chunkEnd;

			Lyte.objectUtils(messageObj, "add", "message", currentText);

			if (!userScrolledUp) {
				requestAnimationFrame(function () {
					if (body) {
						body.scrollTop = body.scrollHeight;
					}
				});
			}

			component._typingTimer = setTimeout(typeNext, speed);
		};

		typeNext();
	},

	formatFileSize: function (bytes) {
		if (!bytes) return "0 B";
		if (bytes < 1024) return bytes + " B";
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
		return (bytes / (1024 * 1024)).toFixed(1) + " MB";
	},

	bindInputEvents: function () {
		let input = this.$node.querySelector(".agents-chat-text-input");
		if (!input || input.__bound) return;

		input.__bound = true;

		input.addEventListener("keydown", event => {
			if (event.key === "Enter") {
				if (event.shiftKey) {
					requestAnimationFrame(() => {
						input.style.height = "20px";
						input.style.height = Math.min(input.scrollHeight, 80) + "px";
						this.updateSendState();
					});
					return;
				}
				event.preventDefault();
				if (this.data.uploadState === "uploading") { return; }
				if (this.getData("canSendMessage")) {
					this.actions.sendMessage.call(this);
				}
			}
		});

		input.addEventListener("input", () => {
			input.style.height = "20px";
			input.style.height = Math.min(input.scrollHeight, 80) + "px";
			this.updateSendState();
		});
	},

	fetchJwtToken: function (config) {
		let isMultiAgent = this.getData("multiAgent");
		let path = "/ziaagents/api/v1/chatsdk/webchat/auth";
		let url = config.url + path;

		return fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-ZIAAGENTS-ORG": config.orgId || "",
				"X-ZIAAGENTS-CHATSDK-DEPLOYMENT-ID": config.entityId || ""
			},
			body: JSON.stringify({
				privateKey: config.sskKey
			})
		}).then(response => {
			if (!response.ok) {
				throw new Error("API_FAILED");
			}
			return response.json();
		})
			.then(json => {
				if (!json?.data?.authenticated) {
					throw new Error("AUTH_FAILED");
				}

				return json?.data?.token || json?.token;
			});
	},

	tryReAuthOnce: function () {
		if (this.data.reauthInProgress || this.data.reauthTried) {
			return Promise.reject();
		}

		this.setData({ "reauthInProgress": true, "reauthTried": true });

		let chatConfig = this.data.config || {};
		let authPromise;

		if (typeof ziaagents !== "undefined" && ziaagents.authAuthentication) {
			authPromise = ziaagents.authAuthentication(chatConfig);
		} else {
			authPromise = this.fetchJwtToken(chatConfig);
		}

		return authPromise.then(token => {
			this.setData({ "jwtToken": token, "reauthInProgress": false });
			return token;
		}).catch(() => {
			this.setData("reauthInProgress", false);
			throw new Error();
		});
	},

	updateSendState: function () {
		let input = this.$node.querySelector(".agents-chat-text-input");
		let hasText = input && input.value.trim().length > 0;
		this.setData("canSendMessage", hasText);
	},

	isValidCustomSessionId: function (id) {
		if (!id || typeof id !== "string") return false;

		if (id.length < 10 || id.length > 150) return false;

		if (!/^[A-Za-z0-9-]+$/.test(id)) return false;

		if (!/^[A-Za-z0-9].*[A-Za-z0-9]$/.test(id)) return false;

		return true;
	},

	defaultInit: function () {
		let chatConfig = this.getData("config") || {};
		let initUrl = `/ziaagents/api/v1/chatsdk/webchat/init`;

		fetch(initUrl, {
			method: "GET",
			headers: {
				"X-ZIAAGENTS-ORG": chatConfig.orgId,
				"X-ZIAAGENTS-CHATSDK-DEPLOYMENT-ID": chatConfig.entityId
			}
		})
			.then(response => {
				if (!response.ok) throw new Error();
				return response.json();
			})
			.then(result => {
				let data = result?.data || {};
				if (data) {
					let isMultiAgent = data?.webChatEntityType && data.webChatEntityType !== "AGENT";
					let headerName = data?.customName || data?.webChatEntityName || chatConfig.agentHeaderName || "Assistance";
					let supportedFileAttachments2 = Array.isArray(data?.supportedFileAttachments) && data.supportedFileAttachments.length ? data.supportedFileAttachments : []; //No I18N
					let defaultInitUpdate = {
						isWebChatAttachmentEnabled: data?.isWebChatAttachmentEnabled || false,
						supportedFileAttachments: supportedFileAttachments2, //No I18N
						fileAcceptTypes: supportedFileAttachments2.join(","), //No I18N
						agentHeaderName: headerName,
						multiAgent: isMultiAgent
					};

					if (data?.customWelcomeMessage) {
						defaultInitUpdate.welcomeMessage = data.customWelcomeMessage;
					}

					if (data?.customMessageBox) {
						defaultInitUpdate.inputPlaceholder = data.customMessageBox;
					}

					if (data?.customColorTheme) {
						defaultInitUpdate.customColorTheme = data.customColorTheme;
					}

					if (data?.customButton !== undefined) {
						defaultInitUpdate.customButton = data.customButton || 1;
					} else {
						defaultInitUpdate.customButton = 1;
					}

					if (data?.customIconUrl) {
						defaultInitUpdate.customIconUrl = data.customIconUrl;
						document.documentElement.style.setProperty("--agents-bot-avatar", `url("${data.customIconUrl}")`);
					} else {
						let avatarName = data?.webChatEntityName || data?.customName || "Assistance";
						let avatar = this.computeDefaultAvatarUrl(avatarName, isMultiAgent ? 'multi-agents' : 'agents', 'medium');
						defaultInitUpdate.defaultAvatarUrl = avatar;
						document.documentElement.style.setProperty("--agents-bot-avatar", `url("${avatar}")`);
					}

					if (data?.chatOpenByDefault !== undefined) {
						defaultInitUpdate.chatDefaultOpen = data.chatOpenByDefault !== false;
					}

					let themeColor = data?.customColorTheme || "#6B4EFF";
					document.documentElement.style.setProperty("--agents-primary-color", themeColor);

					this.setData(defaultInitUpdate);

					if (data?.customWelcomeMessage) {
						let history = this.getData("agentUserChatHistory");
						if (history && history.length && history[0].messagetype === "bot") {
							Lyte.objectUtils(history[0], "add", "message", data.customWelcomeMessage);
						}
					}
				}
			})
			.catch(() => { });
	}
});

(async function () {
	try {
		if (ziaagents && ziaagents.url) {
			const spriteIcons = `${ziaagents.url}/resources/addon-chat/assets/images/sprite-icons.svg`;
			const spriteIcon = `${ziaagents.url}/resources/addon-chat/assets/images/sprite_icons.svg`;

			document.documentElement.style.setProperty(
				"--sprite-icons-url",
				`url("${spriteIcons}")`
			);

			document.documentElement.style.setProperty(
				"--sprite-icon-url",
				`url("${spriteIcon}")`
			);

			void document.documentElement.offsetHeight;

			await Promise.all([
				new Promise(function (resolve) {
					var img1 = new Image();
					img1.onload = resolve;
					img1.onerror = resolve;
					img1.src = spriteIcons;
				}),

				new Promise(function (resolve) {
					var img2 = new Image();
					img2.onload = resolve;
					img2.onerror = resolve;
					img2.src = spriteIcon;
				})
			]);
		}
	} catch (exception) { }
})();