FUNCTION zmcp_adt_ddic_doma_read
  IMPORTING
    VALUE(iv_name)    TYPE string
    VALUE(iv_version) TYPE string DEFAULT 'A'
  EXPORTING
    VALUE(ev_subrc)   TYPE i
    VALUE(ev_message) TYPE string
    VALUE(ev_result)  TYPE string.

* ZMCP_ADT_DDIC_DOMA_READ - read domain metadata + fixed values.
*
* Bridge for legacy ECC kernels (BASIS < 7.50) where the standard ADT
* endpoint for DDIC reads is missing. Returns a JSON skeleton compatible
* with the marketplace handler handleGetDomain.
*
* Sources (verified against ECC 7.40 kernel):
*   DD01L(DOMNAME, AS4LOCAL, DATATYPE, LENG, DECIMALS, OUTPUTLEN,
*         LOWERCASE, SIGNFLAG, CONVEXIT, ENTITYTAB, VALEXI, ...) - header
*   DD01T(DOMNAME, DDLANGUAGE, AS4LOCAL, DDTEXT)                - description
*   DD07L(DOMNAME, AS4LOCAL, VALPOS, DOMVALUE_L, DOMVALUE_H,
*         APPVAL)                                                - fixed values
*   DD07T(DOMNAME, DDLANGUAGE, AS4LOCAL, VALPOS, DDTEXT, ...)   - fixed value descriptions
*   TADIR                                                        - package
*
* Version: 'A' active (AS4LOCAL='A'), 'I' inactive (AS4LOCAL='N').

  TYPES: BEGIN OF ty_fixed_value,
           valpos      TYPE i,
           low         TYPE string,
           high        TYPE string,
           description TYPE string,
         END OF ty_fixed_value.

  TYPES: BEGIN OF ty_result,
           name         TYPE string,
           datatype     TYPE string,
           leng         TYPE i,
           decimals     TYPE i,
           outputlen    TYPE i,
           lowercase    TYPE abap_bool,
           signflag     TYPE abap_bool,
           convexit     TYPE string,
           value_table  TYPE string,
           description  TYPE string,
           package      TYPE devclass,
           fixed_values TYPE STANDARD TABLE OF ty_fixed_value WITH DEFAULT KEY,
         END OF ty_result.

  DATA: lv_name     TYPE c LENGTH 30,
        lv_as4local TYPE c LENGTH 1,
        ls_dd01l    TYPE dd01l,
        ls_dd01t    TYPE dd01t,
        lt_dd07l    TYPE STANDARD TABLE OF dd07l WITH DEFAULT KEY,
        ls_dd07l    TYPE dd07l,
        lt_dd07t    TYPE STANDARD TABLE OF dd07t WITH DEFAULT KEY,
        ls_dd07t    TYPE dd07t,
        ls_fv       TYPE ty_fixed_value,
        ls_result   TYPE ty_result,
        lv_devclass TYPE devclass.

  CLEAR: ev_subrc, ev_message, ev_result.

  IF iv_name IS INITIAL.
    ev_subrc   = 4.
    ev_message = 'iv_name is required'.
    RETURN.
  ENDIF.

  lv_name = to_upper( iv_name ).
  ls_result-name = lv_name.

  IF iv_version = 'I'.
    lv_as4local = 'N'.
  ELSE.
    lv_as4local = 'A'.
  ENDIF.

  TRY.
*     === Step 1: header (DD01L) ===
      SELECT SINGLE * FROM dd01l INTO ls_dd01l
        WHERE domname  = lv_name
          AND as4local = lv_as4local.

      IF sy-subrc <> 0.
        ev_subrc   = 4.
        ev_message = |Domain { lv_name } not in DD01L (version { iv_version })|.
        ev_result  = /ui2/cl_json=>serialize(
          data        = ls_result
          compress    = abap_true
          pretty_name = /ui2/cl_json=>pretty_mode-low_case ).
        RETURN.
      ENDIF.

      ls_result-datatype    = ls_dd01l-datatype.
      ls_result-leng        = ls_dd01l-leng.
      ls_result-decimals    = ls_dd01l-decimals.
      ls_result-outputlen   = ls_dd01l-outputlen.
      ls_result-convexit    = ls_dd01l-convexit.
      ls_result-value_table = ls_dd01l-entitytab.
      IF ls_dd01l-lowercase = 'X'.
        ls_result-lowercase = abap_true.
      ENDIF.
      IF ls_dd01l-signflag = 'X'.
        ls_result-signflag = abap_true.
      ENDIF.

*     === Step 2: description (DD01T) ===
      SELECT SINGLE * FROM dd01t INTO ls_dd01t
        WHERE domname    = lv_name
          AND ddlanguage = sy-langu
          AND as4local   = lv_as4local.
      IF sy-subrc <> 0.
        SELECT SINGLE * FROM dd01t INTO ls_dd01t
          WHERE domname    = lv_name
            AND ddlanguage = 'E'
            AND as4local   = lv_as4local.
      ENDIF.
      IF sy-subrc = 0.
        ls_result-description = ls_dd01t-ddtext.
      ENDIF.

*     === Step 3: package (TADIR) ===
      SELECT SINGLE devclass FROM tadir
        INTO lv_devclass
        WHERE pgmid = 'R3TR' AND object = 'DOMA'
          AND obj_name = lv_name.
      IF sy-subrc = 0.
        ls_result-package = lv_devclass.
      ENDIF.

*     === Step 4: fixed values (DD07L) ===
      SELECT * FROM dd07l INTO TABLE lt_dd07l
        WHERE domname  = lv_name
          AND as4local = lv_as4local
        ORDER BY valpos.

*     === Step 5: fixed value descriptions (DD07T, batch in logon language) ===
      IF lt_dd07l IS NOT INITIAL.
        SELECT * FROM dd07t INTO TABLE lt_dd07t
          FOR ALL ENTRIES IN lt_dd07l
          WHERE domname    = lt_dd07l-domname
            AND ddlanguage = sy-langu
            AND as4local   = lt_dd07l-as4local
            AND valpos     = lt_dd07l-valpos.
      ENDIF.

      LOOP AT lt_dd07l INTO ls_dd07l.
        CLEAR ls_fv.
        ls_fv-valpos = ls_dd07l-valpos.
        ls_fv-low    = ls_dd07l-domvalue_l.
        ls_fv-high   = ls_dd07l-domvalue_h.

        READ TABLE lt_dd07t INTO ls_dd07t
          WITH KEY domname = ls_dd07l-domname
                   valpos  = ls_dd07l-valpos.
        IF sy-subrc = 0.
          ls_fv-description = ls_dd07t-ddtext.
        ELSE.
*         per-row EN fallback
          SELECT SINGLE ddtext FROM dd07t
            INTO ls_fv-description
            WHERE domname    = ls_dd07l-domname
              AND ddlanguage = 'E'
              AND as4local   = lv_as4local
              AND valpos     = ls_dd07l-valpos.
        ENDIF.

        APPEND ls_fv TO ls_result-fixed_values.
      ENDLOOP.

      ev_result = /ui2/cl_json=>serialize(
        data        = ls_result
        compress    = abap_true
        pretty_name = /ui2/cl_json=>pretty_mode-low_case ).

      ev_subrc   = 0.
      ev_message = |DOMA { lv_name }: type={ ls_result-datatype }({ ls_result-leng }), { lines( ls_result-fixed_values ) } fixed value(s)|.

    CATCH cx_root INTO DATA(lx_root).
      ev_subrc   = 8.
      ev_message = lx_root->get_text( ).
  ENDTRY.

ENDFUNCTION.
