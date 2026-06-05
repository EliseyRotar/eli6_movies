# Kotlinx Serialization — keep generated serializers
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keep,includedescriptorclasses class com.eli6movies.app.**$$serializer { *; }
-keepclassmembers class com.eli6movies.app.** {
    *** Companion;
}
-keepclasseswithmembers class com.eli6movies.app.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Retrofit / OkHttp
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn javax.annotation.**

# WebView
-keepclassmembers class * extends android.webkit.WebChromeClient { public void *(...); }
-keepclassmembers class * extends android.webkit.WebViewClient { public void *(...); }
