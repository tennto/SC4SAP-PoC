class ZCL_S4SAP_CM_ALV_EVENT definition
  public
  create public .

public section.

  types:
    BEGIN OF TY_EVENTLIST,
    event TYPE formname,
    form  TYPE formname,
    method type string,
    repid TYPE sy-repid,
          END OF TY_EVENTLIST .
  types:
    TT_EVENTLIST TYPE TABLE OF TY_EVENTLIST .

  data MT_EVENTLIST type TT_EVENTLIST .
  data MV_LOCAL_CLASS_DEFINITION type STRING .

  methods HANDLE_TOOLBAR
    for event TOOLBAR of CL_GUI_ALV_GRID
    importing
      !E_OBJECT
      !E_INTERACTIVE
      !SENDER .
  methods HANDLE_USER_COMMAND
    for event USER_COMMAND of CL_GUI_ALV_GRID
    importing
      !E_UCOMM
      !SENDER .
  methods HANDLE_DATA_CHANGED
    for event DATA_CHANGED of CL_GUI_ALV_GRID
    importing
      !ER_DATA_CHANGED
      !E_ONF4
      !E_ONF4_BEFORE
      !E_ONF4_AFTER
      !E_UCOMM
      !SENDER .
  methods HANDLE_DATA_CHANGED_FINISHED
    for event DATA_CHANGED_FINISHED of CL_GUI_ALV_GRID
    importing
      !E_MODIFIED
      !ET_GOOD_CELLS
      !SENDER .
  methods HANDLE_HOTSPOT_CLICK
    for event HOTSPOT_CLICK of CL_GUI_ALV_GRID
    importing
      !E_ROW_ID
      !E_COLUMN_ID
      !ES_ROW_NO
      !SENDER .
  methods HANDLE_DOUBLE_CLICK
    for event DOUBLE_CLICK of CL_GUI_ALV_GRID
    importing
      !E_ROW
      !E_COLUMN
      !ES_ROW_NO
      !SENDER .
  methods HANDLE_ONF4
    for event ONF4 of CL_GUI_ALV_GRID
    importing
      !E_FIELDNAME
      !E_FIELDVALUE
      !ES_ROW_NO
      !ER_EVENT_DATA
      !ET_BAD_CELLS
      !E_DISPLAY
      !SENDER .
  methods HANDLE_TOP_OF_PAGE
    for event TOP_OF_PAGE of CL_GUI_ALV_GRID
    importing
      !E_DYNDOC_ID
      !SENDER .
  methods CONSTRUCTOR
    importing
      !IV_REPID type SY-CPROG default SY-CPROG
      !IV_LOCAL_CLASS_DEFINITION type STRING .
  methods HANDLE_ONDRAG
    for event ONDRAG of CL_GUI_ALV_GRID
    importing
      !E_ROW
      !E_COLUMN
      !ES_ROW_NO
      !E_DRAGDROPOBJ
      !SENDER .
  methods HANDLE_ONDROP
    for event ONDROP of CL_GUI_ALV_GRID
    importing
      !E_ROW
      !E_COLUMN
      !ES_ROW_NO
      !E_DRAGDROPOBJ
      !SENDER .
  methods HANDLE_ONDROPCOMPLETE
    for event ONDROPCOMPLETE of CL_GUI_ALV_GRID
    importing
      !E_ROW
      !E_COLUMN
      !ES_ROW_NO
      !E_DRAGDROPOBJ
      !SENDER .
  methods HANDLE_DROP_EXTERNAL_FILES
    for event DROP_EXTERNAL_FILES of CL_GUI_ALV_GRID
    importing
      !FILES
      !SENDER .
protected section.
private section.
ENDCLASS.



CLASS ZCL_S4SAP_CM_ALV_EVENT IMPLEMENTATION.


  method CONSTRUCTOR.

    MV_LOCAL_CLASS_DEFINITION
    = |\\PROGRAM={ IV_REPID }| &&
      |\\CLASS={ IV_LOCAL_CLASS_DEFINITION }|.


    "\PROGRAM=ZMYPROG\CLASS=LCL_CM

    MT_EVENTLIST = VALUE #(
    REPID = IV_REPID
    ( event = 'HANDLE_TOOLBAR' )
    ( event = 'HANDLE_USER_COMMAND' )
    ( event = 'HANDLE_DATA_CHANGED' )
    ( event = 'HANDLE_DATA_CHANGED_FINISHED' )
    ( event = 'HANDLE_HOTSPOT_CLICK' )
    ( event = 'HANDLE_DOUBLE_CLICK' )
    ( event = 'HANDLE_ONF4' )
    ( event = 'HANDLE_TOP_OF_PAGE' )
    ( event = 'HANDLE_ONDRAG' )
    ( event = 'HANDLE_ONDROP' )
    ( event = 'HANDLE_ONDROPCOMPLETE' )
    ( event = 'HANDLE_DROP_EXTERNAL_FILES' )
                           ).

  endmethod.


  METHOD HANDLE_DATA_CHANGED.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_DATA_CHANGED'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING ER_DATA_CHANGED
                                            E_ONF4
                                            E_ONF4_BEFORE
                                            E_ONF4_AFTER
                                            E_UCOMM
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OALV( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                ER_DATA_CHANGED = ER_DATA_CHANGED
                E_ONF4          = E_ONF4
                E_ONF4_BEFORE   = E_ONF4_BEFORE
                E_ONF4_AFTER    = E_ONF4_AFTER
                E_UCOMM         = E_UCOMM
                SENDER          = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                ER_DATA_CHANGED = ER_DATA_CHANGED
                E_ONF4          = E_ONF4
                E_ONF4_BEFORE   = E_ONF4_BEFORE
                E_ONF4_AFTER    = E_ONF4_AFTER
                E_UCOMM         = E_UCOMM.
        ENDTRY.
      ENDIF.

    ENDIF.
  ENDMETHOD.                    "HANDLE_DATA_CHANGED


  METHOD HANDLE_DATA_CHANGED_FINISHED.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_DATA_CHANGED_FINISHED'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING E_MODIFIED
                                            ET_GOOD_CELLS
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OALV( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                E_MODIFIED = E_MODIFIED
                SENDER     = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                E_MODIFIED = E_MODIFIED.
        ENDTRY.
      ENDIF.
    ENDIF.

  ENDMETHOD.                    "HANDLE_DATA_CHANGED_FINISHED


  METHOD HANDLE_DOUBLE_CLICK.
    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_DOUBLE_CLICK'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING E_ROW
                                            E_COLUMN
                                            ES_ROW_NO
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OALV( SENDER ).

        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                E_ROW     = E_ROW
                E_COLUMN  = E_COLUMN
                ES_ROW_NO = ES_ROW_NO
                SENDER    = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                E_ROW     = E_ROW
                E_COLUMN  = E_COLUMN
                ES_ROW_NO = ES_ROW_NO.
        ENDTRY.
      ENDIF.
    ENDIF.


  ENDMETHOD.                    "HANDLE_DOUBLE_CLICK


  METHOD HANDLE_DROP_EXTERNAL_FILES.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_DROP_EXTERNAL_FILES'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING FILES
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OALV( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                FILES  = FILES
                SENDER = SENDER.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                FILES = FILES.
        ENDTRY.
      ENDIF.
    ENDIF.


  ENDMETHOD.


  METHOD HANDLE_HOTSPOT_CLICK.


    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_HOTSPOT_CLICK'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING E_ROW_ID
                                            E_COLUMN_ID
                                            ES_ROW_NO
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OALV( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                E_ROW_ID    = E_ROW_ID
                E_COLUMN_ID = E_COLUMN_ID
                ES_ROW_NO   = ES_ROW_NO
                SENDER      = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                E_ROW_ID    = E_ROW_ID
                E_COLUMN_ID = E_COLUMN_ID
                ES_ROW_NO   = ES_ROW_NO.
        ENDTRY.
      ENDIF.
    ENDIF.

  ENDMETHOD.                    "HANDLE_HOTSPOT_CLICK


  METHOD HANDLE_ONDRAG.


    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_ONDRAG'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING E_ROW
                                            E_COLUMN
                                            ES_ROW_NO
                                            E_DRAGDROPOBJ
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OALV( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                E_ROW         = E_ROW
                E_COLUMN      = E_COLUMN
                ES_ROW_NO     = ES_ROW_NO
                E_DRAGDROPOBJ = E_DRAGDROPOBJ
                SENDER        = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                E_ROW         = E_ROW
                E_COLUMN      = E_COLUMN
                ES_ROW_NO     = ES_ROW_NO
                E_DRAGDROPOBJ = E_DRAGDROPOBJ.
        ENDTRY.
      ENDIF.
    ENDIF.

  ENDMETHOD.


  METHOD HANDLE_ONDROP.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_ONDROP'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING E_ROW
                                            E_COLUMN
                                            ES_ROW_NO
                                            E_DRAGDROPOBJ
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OALV( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                E_ROW         = E_ROW
                E_COLUMN      = E_COLUMN
                ES_ROW_NO     = ES_ROW_NO
                E_DRAGDROPOBJ = E_DRAGDROPOBJ
                SENDER        = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                E_ROW         = E_ROW
                E_COLUMN      = E_COLUMN
                ES_ROW_NO     = ES_ROW_NO
                E_DRAGDROPOBJ = E_DRAGDROPOBJ.
        ENDTRY.
      ENDIF.
    ENDIF.


  ENDMETHOD.


  METHOD HANDLE_ONDROPCOMPLETE.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_ONDROPCOMPLETE'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING E_ROW
                                            E_COLUMN
                                            ES_ROW_NO
                                            E_DRAGDROPOBJ
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OALV( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                E_ROW         = E_ROW
                E_COLUMN      = E_COLUMN
                ES_ROW_NO     = ES_ROW_NO
                E_DRAGDROPOBJ = E_DRAGDROPOBJ
                SENDER        = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                E_ROW         = E_ROW
                E_COLUMN      = E_COLUMN
                ES_ROW_NO     = ES_ROW_NO
                E_DRAGDROPOBJ = E_DRAGDROPOBJ.
        ENDTRY.
      ENDIF.
    ENDIF.


  ENDMETHOD.


  METHOD HANDLE_ONF4.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_ONF4'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING E_FIELDNAME
                                            E_FIELDVALUE
                                            ES_ROW_NO
                                            ER_EVENT_DATA
                                            ET_BAD_CELLS
                                            E_DISPLAY
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OALV( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                E_FIELDNAME   = E_FIELDNAME
                E_FIELDVALUE  = E_FIELDVALUE
                ES_ROW_NO     = ES_ROW_NO
                ER_EVENT_DATA = ER_EVENT_DATA
                ET_BAD_CELLS  = ET_BAD_CELLS
                E_DISPLAY     = E_DISPLAY
                SENDER        = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                E_FIELDNAME   = E_FIELDNAME
                E_FIELDVALUE  = E_FIELDVALUE
                ES_ROW_NO     = ES_ROW_NO
                ER_EVENT_DATA = ER_EVENT_DATA
                ET_BAD_CELLS  = ET_BAD_CELLS
                E_DISPLAY     = E_DISPLAY.
        ENDTRY.
      ENDIF.

    ENDIF.


  ENDMETHOD.                    "HANDLE_ON_F4


  METHOD HANDLE_TOOLBAR       . "Create Icon

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_TOOLBAR'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING E_OBJECT E_INTERACTIVE SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OALV( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                E_OBJECT      = E_OBJECT
                E_INTERACTIVE = E_INTERACTIVE
                SENDER        = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                E_OBJECT      = E_OBJECT
                E_INTERACTIVE = E_INTERACTIVE.
        ENDTRY.
      ENDIF.



    ENDIF.

  ENDMETHOD.                    "HANDLE_TOOLBAR


  METHOD HANDLE_TOP_OF_PAGE.

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_TOP_OF_PAGE'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING E_DYNDOC_ID
                                            SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OALV( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                E_DYNDOC_ID = E_DYNDOC_ID
                SENDER      = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                E_DYNDOC_ID = E_DYNDOC_ID.
        ENDTRY.
      ENDIF.

    ENDIF.


  ENDMETHOD.


  METHOD HANDLE_USER_COMMAND  .

    READ TABLE MT_EVENTLIST WITH KEY EVENT = 'HANDLE_USER_COMMAND'
                            ASSIGNING FIELD-SYMBOL(<FS_EVENTLIST>).
    IF SY-SUBRC = 0.
      IF <FS_EVENTLIST>-FORM IS NOT INITIAL.
        PERFORM (<FS_EVENTLIST>-FORM) IN PROGRAM (<FS_EVENTLIST>-REPID) IF FOUND
                                      USING E_UCOMM SENDER.
      ELSEIF <FS_EVENTLIST>-METHOD IS NOT INITIAL.
        CHECK MV_LOCAL_CLASS_DEFINITION IS NOT INITIAL.

        DATA(LO_SENDOR) = CAST ZCL_S4SAP_CM_OALV( SENDER ).
        TRY.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                E_UCOMM = E_UCOMM
                SENDER  = LO_SENDOR.
          CATCH CX_SY_DYN_CALL_PARAM_NOT_FOUND.
            CALL METHOD (MV_LOCAL_CLASS_DEFINITION)=>(<FS_EVENTLIST>-METHOD)
              EXPORTING
                E_UCOMM = E_UCOMM.
        ENDTRY.
      ENDIF.
    ENDIF.

  ENDMETHOD.
ENDCLASS.
